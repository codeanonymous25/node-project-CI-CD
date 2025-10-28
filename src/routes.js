// routes.js
'use strict';
require('newrelic');
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.type('html').send(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>BMI Calculator</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body { font-family: Arial, sans-serif; margin: 2rem; max-width: 600px; }
          label { display: block; margin-top: 1rem; font-weight: bold; }
          input { padding: .5rem; width: 200px; }
          button { margin-top: 1rem; padding: .5rem 1rem; }
          pre { background: #f6f8fa; padding: 1rem; border-radius: 6px; }
        </style>
      </head>
      <body>
        <h1>BMI Calculator</h1>
        <form id="form">
          <label>Height (cm)
            <input type="number" id="height" min="1" step="0.1" required />
          </label>
          <label>Weight (kg)
            <input type="number" id="weight" min="1" step="0.1" required />
          </label>
          <button type="submit">Calculate</button>
        </form>

        <h3>Result</h3>
        <pre id="out">—</pre>

        <script>
          const form = document.getElementById('form');
          const out = document.getElementById('out');

          form.addEventListener('submit', async (e) => {
            e.preventDefault(); // Prevent page reload
            const h = document.getElementById('height').value;
            const w = document.getElementById('weight').value;

            try {
              const res = await fetch('/bmi?height=' + h + '&weight=' + w);
              const data = await res.json();
              if (data.error) {
                out.textContent = 'Error: ' + data.error;
              } else {
                out.textContent = 'BMI: ' + data.bmi + ' Category: ' + data.category;
              }
            } catch (err) {
              out.textContent = 'Error: ' + err.message;
            }
          });
        </script>
      </body>
    </html>
  `);
});

router.get('/bmi', (req, res) => {
  const height = parseFloat(req.query.height);
  const weight = parseFloat(req.query.weight);

  if (!height || !weight || height <= 0 || weight <= 0) {
    return res.status(400).json({ error: 'Provide positive height and weight' });
  }

  const hMeters = height / 100;
  const bmi = +(weight / (hMeters * hMeters)).toFixed(2);
  let category = 'Normal';
  if (bmi < 18.5) category = 'Underweight';
  else if (bmi >= 25 && bmi < 30) category = 'Overweight';
  else if (bmi >= 30) category = 'Obesity';

  res.json({ bmi, category });
});

router.get('/favicon.ico', (_req, res) => res.status(204).end());

module.exports = router;
