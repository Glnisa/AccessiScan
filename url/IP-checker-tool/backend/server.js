const express = require('express');
const cors = require('cors');
const axios = require('axios');
const net = require('net');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Helper to wait for a specific time
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Simple semaphore-like concurrency limiter
const limitConcurrency = (tasks, limit) => {
    return new Promise((resolve) => {
        let results = [];
        let running = 0;
        let index = 0;

        const runNext = async () => {
            if (index >= tasks.length && running === 0) {
                resolve(results);
                return;
            }

            while (running < limit && index < tasks.length) {
                const currentIndex = index++;
                running++;
                tasks[currentIndex]().then((res) => {
                    results[currentIndex] = res;
                    running--;
                    runNext();
                });
            }
        };

        runNext();
    });
};

const checkUrl = async (url, retryCount = 3) => {
    console.log(`Checking URL: ${url} (Retries left: ${retryCount})`);
    try {
        let fullUrl = url.trim();
        if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
            fullUrl = `https://${fullUrl}`;
        }

        const response = await axios.get(fullUrl, {
            timeout: 10000, // Increased timeout for stability
            validateStatus: (status) => true,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
            }
        });

        const accessible = response.status >= 200 && response.status < 400;

        // If not accessible but still a valid response, maybe retry for semi-errors
        if (!accessible && retryCount > 0 && [429, 500, 502, 503, 504].includes(response.status)) {
            console.log(`Retrying URL ${url} due to status ${response.status}`);
            await wait((4 - retryCount) * 2000); // Exponential wait
            return checkUrl(url, retryCount - 1);
        }

        return {
            url: fullUrl,
            status: response.status,
            statusText: response.statusText || (accessible ? 'OK' : 'Inaccessible'),
            accessible: accessible,
            error: null
        };
    } catch (error) {
        if (retryCount > 0) {
            console.log(`Retrying URL ${url} due to error: ${error.message}`);
            await wait((4 - retryCount) * 2000);
            return checkUrl(url, retryCount - 1);
        }

        console.error(`Final failure for URL ${url}: ${error.message}`);
        return {
            url: url,
            status: error.response ? error.response.status : 'ERROR',
            statusText: error.message,
            accessible: false,
            error: error.message
        };
    }
};

const checkIp = async (ip, retryCount = 2) => {
    console.log(`Checking IP: ${ip} (Retries left: ${retryCount})`);

    const attempt = () => new Promise((resolve) => {
        const socket = new net.Socket();
        let status = null;
        let accessible = false;
        let error = null;

        socket.setTimeout(5000);

        socket.on('connect', () => {
            accessible = true;
            status = 'Connected';
            socket.destroy();
        });

        socket.on('timeout', () => {
            error = 'Timeout';
            socket.destroy();
        });

        socket.on('error', (err) => {
            error = err.message;
            socket.destroy();
        });

        socket.on('close', () => {
            resolve({
                url: ip,
                status: status || 'Failed',
                statusText: error || 'Closed',
                accessible: accessible,
                error: error
            });
        });

        socket.connect(80, ip.trim());
    });

    const result = await attempt();
    if (!result.accessible && retryCount > 0) {
        console.log(`Retrying IP ${ip} after failure`);
        await wait(1500);
        return checkIp(ip, retryCount - 1);
    }
    return result;
};

app.post('/check-urls', async (req, res) => {
    const { urls, mode } = req.body;

    if (!urls || !Array.isArray(urls)) {
        return res.status(400).json({ error: 'Invalid URL list' });
    }

    console.log(`Checking ${urls.length} items in ${mode} mode with retry logic...`);

    const results = await limitConcurrency(
        urls.map((url) => () => (mode === 'ip' ? checkIp(url) : checkUrl(url))),
        10
    );

    res.json({ results });
});

app.listen(port, () => {
    console.log(`Backend server running at http://localhost:${port}`);
});
