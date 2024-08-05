const express = require('express');
const OpenApiValidator = require('express-openapi-validator');
const path = require('path');


const app = express();

app.use(express.json());

const wallets = [
  {
    id: 1,
    name: 'Personal Wallet',
    type: 'HouseholdExpenses',
    colour_code: 'Blue',
  }
];

app.post('/wallets', (req, res) => {
  wallets.push({
    ...req.body,
    id: wallets.length + 1,
  });
  res.status(201).send();
});

app.get('/wallets/:id', (req, res) => {
  const wallet = wallets.find(wallet => wallet.id == req.params.id);

  if (!wallet) {
    res.status(404).send();
    return;
  }

  res.status(200).json({ wallet });
});

app.use(
  OpenApiValidator.middleware({
    apiSpec: path.join(__dirname, '../wallet-openapi.yml'),
    validateRequests: true,
    validateResponses: true,
  }),
);

app.use((err, req, res, next) => {
  if (
    err instanceof OpenApiValidator.error.BadRequest
    || err instanceof OpenApiValidator.error.InternalServerError
  ) {
    return res.status(err.status).json({
      message: err.message,
      errors: err.errors,
    });
  }

  next(err);
});

app.listen(process.env.PORT || 3000, () => { 
  console.log('Wallets API is running');
});
