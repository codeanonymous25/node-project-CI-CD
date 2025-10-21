// metrics.js
'use strict'
const client = require('prom-client')
const express = require('express')

// Collect default metrics
client.collectDefaultMetrics({ prefix: 'node_app_' })

// Custom metrics
const requestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
})

const errorCounter = new client.Counter({
  name: 'errors_total',
  help: 'Total number of HTTP 5xx errors'
})

const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5]
})

const register = client.register

// Metrics router exposes /metrics
const metricsRouter = express.Router()
metricsRouter.get('/', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType)
    res.end(await register.metrics())
  } catch (err) {
    res.status(500).end(err.message)
  }
})

module.exports = { register, metricsRouter, requestCounter, errorCounter, httpDuration }
