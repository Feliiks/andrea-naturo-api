require('dotenv').config({ path: '../.env' });
const express = require('express');
const path = require('path');
const https = require('https')
const fs = require("fs")
const cors = require('cors');
const stripe = require('stripe')('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')
const nodemailer = require('nodemailer')
const hbs = require('nodemailer-express-handlebars')


// SERVER CONFIG _____________________________________________________

const app = express();
const PORT = 5000

app.listen(PORT, () => {
  console.log(`Le serveur est lancé sur le port ${PORT}.`);
});

app.use(
  cors({
    origin: "https://andrea-naturopathie.com",
    credentials: true
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../build")));


// NODEMAILER _______________________________________________________

const transporter = nodemailer.createTransport({
  service: "gmail",
  host: 'smtp.gmail.email',
  auth: {
    user: 'sobrero.ludovic@gmail.com',
    pass: '.G87gx9p135:'
  },
  tls: {
    rejectUnauthorized: false
  }
});

const handlebarOptions = {
  viewEngine: {
    partialsDir: path.resolve('../public/handlebars'),
    defaultLayout: false,
  },
  viewPath: path.resolve('../public/handlebars'),
};

transporter.use('compile', hbs(handlebarOptions))


// ROUTES ___________________________________________________________

app.post('/create-payment-intent', async (req, res) => {
  const { amount, currency } = req.body;

  try {
    if (amount < 100) throw new Error()

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: currency,
      payment_method_types: ['card']
    })

    res.send({
      clientSecret: paymentIntent.client_secret
    })
  } catch {
    return null
  }
})

app.post('/send-products-by-email', async (req, res) => {
  const { email, products } = req.body;

  try {
    let message = {
      from: "'Ludovic SOBRERO' <sobrero.ludovic@gmail.com>",
      to: email,
      subject: "Tes achats sur andreasobrero-naturopathe.com",
      template: 'purchase',
      attachments: []
    }

    Object.keys(products).map(product => {
      message.attachments.push({
        filename: products[product].name,
        path: path.join(__dirname, '../public', products[product].file),
        contentType: 'application/pdf'
      })
    })

    await transporter.sendMail(message)

    res.sendStatus(200)
  } catch (err) {
    console.log(err.message)
  }
})

app.get('/test', (req, res) => {
  res.send("Test ok !")
})