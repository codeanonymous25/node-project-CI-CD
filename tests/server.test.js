'use strict'
const request = require('supertest')
const { app } = require('../src/server')

describe('BMI API', () => {
  it('GET /healthz', async () => {
    const res = await request(app).get('/healthz')
    expect(res.statusCode).toBe(200)
    expect(res.body.status).toBe('ok')
  })

  it('GET /bmi with valid params', async () => {
    const res = await request(app).get('/bmi?height=170&weight=65')
    expect(res.statusCode).toBe(200)
    expect(res.body).toHaveProperty('bmi')
  })

  it('GET /metrics returns text/plain', async () => {
    const res = await request(app).get('/metrics')
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/.+/)
  })
})
