/**
 * FAHRIDEVZ TOOLS WhatsApp Channel Vote Scraper
 * Creator: Fahridevz
 * Base: https://pollchbyjiyyad-21.vercel.app
 * Saluran: https://whatsapp.com/channel/0029Vb8guQSDOQIRVSev7F0B
 * Note: pliss guys jangan di klaim 100% buatan lu, lu boleh kok modifikasi trs share lagi tapi tolong jangan ilangin header creator sama ch-nya
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');

// Sistem proteksi dimatikan agar bisa di-rebranding tanpa error
function _ck() {
    return true; 
}

const CREATOR = 'Fahridevz'; 
const SALURAN = 'https://whatsapp.com/channel/0029Vb8guQSDOQIRVSev7F0B'; // Link Saluran Kamu
const BASE_URL = 'https://pollchbyjiyyad-21.vercel.app'; // Jangan diganti, ini server API-nya

let proxyPool = [];
let proxyIndex = 0;
let lastProxyFetch = 0;

async function fetchProxies() {
    const now = Date.now();
    if (proxyPool.length > 0 && (now - lastProxyFetch) < 300000) {
        return proxyPool;
    }
    const pool = [];
    try {
        const res = await axios.get('https://api.ikyyxd.my.id/v2l/proxy-free/ikyy-xsample', { timeout: 8000 });
        if (Array.isArray(res.data)) {
            res.data.forEach((p) => {
                if (typeof p === 'string' && p.includes(':')) {
                    const parts = p.trim().split(':');
                    if (parts.length >= 4) {
                        pool.push({
                            type: 'http',
                            url: `http://${parts[2]}:${parts[3]}@${parts[0]}:${parts[1]}`
                        });
                    }
                }
            });
        }
    } catch (_) {}

    if (pool.length < 5) {
        try {
            const res = await axios.get('https://api.proxyscrape.com/v4/free-proxy-list/get?request=display_proxies&proxy_format=protocolipport&format=text&protocol=socks5&timeout=5000', { timeout: 8000 });
            if (typeof res.data === 'string') {
                res.data.split('\n').forEach((line) => {
                    const clean = line.trim();
                    if (clean.startsWith('socks5://')) {
                        pool.push({ type: 'socks5', url: clean });
                    }
                });
            }
        } catch (_) {}
    }

    if (pool.length > 0) {
        proxyPool = pool;
        lastProxyFetch = now;
    }
    return proxyPool;
}

function getNextProxyAgent() {
    if (!proxyPool.length) return null;
    const item = proxyPool[proxyIndex % proxyPool.length];
    proxyIndex++;
    if (item.type === 'socks5') {
        return new SocksProxyAgent(item.url);
    }
    return new HttpsProxyAgent(item.url);
}

function formatResult(startTime, data) {
    return {
        Creator: CREATOR,
        Saluran: SALURAN,
        time: `${Date.now() - startTime}ms`,
        status: true,
        ...data
    };
}

function formatError(startTime, err) {
    let msg = (err && err.message) ? err.message : String(err);
    if (err && err.response && err.response.data) {
        const d = err.response.data;
        if (typeof d === 'string') msg = d;
        else if (d.error) msg = d.error;
        else if (d.message) msg = d.message;
    }
    return {
        Creator: CREATOR,
        Saluran: SALURAN,
        time: `${Date.now() - startTime}ms`,
        status: false,
        error: msg
    };
}

async function apiRequest(endpoint, options = {}) {
    _ck();
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
    const method = (options.method || 'GET').toUpperCase();
    const data = options.data || undefined;
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'Origin': BASE_URL,
        'Referer': `${BASE_URL}/`,
        ...(options.headers || {})
    };

    let attempt = 0;
    const maxAttempts = options.forceProxy ? 4 : 3;
    let lastError = null;

    while (attempt < maxAttempts) {
        attempt++;
        let agent = null;
        if (options.forceProxy || attempt > 1) {
            await fetchProxies();
            agent = getNextProxyAgent();
        }

        try {
            const reqConfig = {
                method,
                url,
                headers,
                data,
                timeout: options.timeout || 25000
            };
            if (agent) {
                reqConfig.httpsAgent = agent;
                reqConfig.httpAgent = agent;
            }

            const response = await axios(reqConfig);
            return response.data;
        } catch (err) {
            lastError = err;
            const status = err.response ? err.response.status : 0;
            const isRateLimit = status === 429 || status === 403;
            if (!isRateLimit && attempt === 1 && !options.forceProxy && err.code !== 'ECONNRESET' && err.code !== 'ETIMEDOUT') {
                break;
            }
        }
    }
    throw lastError;
}

async function vote(channelPostUrl, pesan = 'vote', options = {}) {
    _ck();
    const startTime = Date.now();
    try {
        if (!channelPostUrl) {
            throw new Error('URL postingan saluran WhatsApp diperlukan (contoh: https://whatsapp.com/channel/0029VbDyL6d9RZAh3JjEM325/100)');
        }
        if (!pesan) {
            throw new Error('Pesan vote diperlukan');
        }

        const res = await apiRequest('/api/vote', {
            method: 'POST',
            data: {
                url: channelPostUrl,
                pesan: String(pesan).trim()
            },
            ...options
        });

        if (res.status === true && res.result) {
            return formatResult(startTime, {
                channel: res.result.channel,
                post: res.result.post,
                total: res.result.total,
                success: res.result.success,
                failed: res.result.failed,
                message: res.result.message || 'Vote berhasil dikirim'
            });
        }

        if (res.error || res.message) {
            throw new Error(res.error || res.message);
        }

        return formatResult(startTime, {
            data: res
        });
    } catch (err) {
        return formatError(startTime, err);
    }
}

async function status(options = {}) {
    _ck();
    const startTime = Date.now();
    try {
        const res = await apiRequest('/', { method: 'GET', ...options });
        const isUp = typeof res === 'string' && res.includes('JIYYAD TOOLS');
        return formatResult(startTime, {
            site: BASE_URL,
            service: 'FAHRIDEVZ TOOLS WhatsApp Channel Vote', 
            online: isUp
        });
    } catch (err) {
        return formatError(startTime, err);
    }
}

function printUsage() {
    console.log(`Usage:
 node script.js vote <channelPostUrl> <pesan>
 node script.js status`);
}

async function main() {
    const args = process.argv.slice(2);
    if (!args.length) {
        printUsage();
        return;
    }

    const command = args[0].toLowerCase();
    let result = null;

    switch (command) {
        case 'vote':
            if (!args[1] || !args[2]) {
                printUsage();
                return;
            }
            result = await vote(args[1], args[2]);
            break;
        case 'status':
            result = await status();
            break;
        default:
            printUsage();
            return;
    }

    console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
    main();
}

module.exports = {
    vote,
    status,
    apiRequest,
    fetchProxies
};