// server.js
'use strict'
const express = require('express')
const compression = require('compression')
const helmet = require('helmet')
const cors = require('cors')
const morgan = require('morgan')
const { metricsRouter, requestCounter, errorCounter, httpDuration } = require('./metrics')
const routes = require('./routes')

const app = express()

app.use(helmet())
app.use(cors())
app.use(compression())
app.use(express.json())
app.use(morgan('combined'))

// Metrics middleware: measure request durations
app.use((req, res, next) => {
  const end = httpDuration.startTimer({ method: req.method, route: req.path })
  res.on('finish', () => {
    end({ status_code: res.statusCode })
    requestCounter.inc({ method: req.method, route: req.path, status_code: res.statusCode })
    if (res.statusCode >= 500) errorCounter.inc()
  })
  next()
})

app.get('/healthz', (req, res) => res.status(200).json({ status: 'ok' }))

// Business routes
app.use('/', routes)

// Metrics endpoint
app.use('/metrics', metricsRouter)

const port = process.env.PORT || 3011
app.listen(port, () => {
  console.log(`BMI Metrics app listening on port ${port}`)
})

module.exports = { app }
