const express = require("express");
const app = express();
const cors = require("cors");
const nodemailer = require("nodemailer");
const admin = require("firebase-admin");
require("dotenv").config();
const { MongoClient } = require("mongodb");
const ObjectId = require("mongodb").ObjectId;
const stripe = require("stripe")(process.env.STRIPE_SECRET);

const port = process.env.PORT || 5000;

const serviceAccount = require("./doctors-portal-prc-firebase-adminsdk.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://mydbuser1:cheprji57ZAug8nN@cluster0.vikxe.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith("Bearer ")) {
    const token = req.headers.authorization.split(" ")[1];

    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
    } catch {}
  }
  next();
}

async function run() {
  try {
    const sendPlaceAppointmentEmailFunction = (data) => {
      const appointmentId = Math.round(Math.random() * 1000000);
      const transporter = nodemailer.createTransport({
        service: "hotmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
      const options = {
        from: "tasneemabdullah09@hotmail.com",
        to: data.email,
        subject: "Confirmed your appointment",
        text: "",
        html: `
        <a href = "https://auto-trader-online.web.app/">
        <img alt = "Doctors Portal" src = "https://i.ibb.co/qm3B8DZ/119767-message-svg.png" style = "width: 250px; display: block; margin: 10px auto;">
        </a>
        <div style = "text-align: center;">
                <h1 style = "text-align: center;">Congratulation! Your Appointment Booked Successfully..</h1>

                <h2 style = "font-size: 28px; text-align: center;">Your Appointment Id: <b>#${appointmentId}</b></h2>

                <h3 style = "font-size: 24px; color: #636363;">Patient Name: <span style = "color: #0882E3;">${data.patientName}</span></h3>

                <div style = "width: 50%;  background:linear-gradient(45deg, #22e87e, #3196ec); color: #E0E0E0; border-radius: 15px; padding: 30px; margin: 20px auto; text-align: center;">
        <h3 style = "font-size: 18px;">Your Booking:</h3>

        <h3 style = "font-size: 18px;">${data.serviceName}</h3>
        <h3 style = "font-size: 18px;">Total Due Amount: $ ${data.price}</h3>
                </div>

        <h3 style = "font-size: 20px;">Doctor visiting time: ${data.time}</h3>

        <h4 style = "font-size: 17px;">Visit at ${data.time} for your ${data.serviceName} to Doctors Portal.</h4>



        <p style = "font-size: 17px;"> Thanks, ${data.patientName} for making appointment in Doctors Portal.</p>


        <p style = "font-size: 17px;"> Now pay, the due amount from Doctors Portal / Dashboard / Appointment. Or <a style = "text-align: center;" href = "https://auto-trader-online.web.app/">Click Here</a></p>

        <a style = "text-align: center;" href = "https://auto-trader-online.web.app/">Visit Doctors Portal</a>


        <img alt = "Order Confirmed" style = "display: block; margin: 2px auto" src = "https://i.ibb.co/YDLv3Yp/Confirmed-rafiki.png" width = "50%"/>
        </div>
        `,
      };
      transporter.sendMail(options, (err, info) => {
        if (err) {
          console.log(err);
          return;
        }
        console.log(info.response);
      });
    };
    const sendPaymentEmailFunction = (data) => {
      const transporter = nodemailer.createTransport({
        service: "hotmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
      const options = {
        from: "tasneemabdullah09@hotmail.com",
        to: data.email,
        subject: "Payment Done",
        text: "",
        html: `
        <a href = "https://auto-trader-online.web.app/">
        <img alt = "Doctors Portal" src = "https://i.ibb.co/qm3B8DZ/119767-message-svg.png" style = "width: 250px; display: block; margin: 10px auto;">
        </a>
        <div style = "text-align: center;">

                <div style = "width: 50%;  background:linear-gradient(45deg, #22e87e, #3196ec); color: #E0E0E0; border-radius: 15px; padding: 30px; margin: 20px auto; text-align: center;">
        <h3 style = "font-size: 18px;">You have paid: $${data.price}</h3>

        <h1 style = "text-align: center;">Thanks, ${data.name} your payment success.</h1>

        <img alt = "Order Confirmed" style = "display: block; margin: 2px auto" src = "https://i.ibb.co/t8RHzGw/Sponsor-bro.png" width = "100%"/>
        </div>
                <a style = "text-align: center;" href = "https://auto-trader-online.web.app/">Visit Doctors Portal Again</a>
        `,
      };
      transporter.sendMail(options, (err, info) => {
        if (err) {
          console.log(err);
          return;
        }
        console.log(info.response);
      });
    };
    await client.connect();
    const database = client.db("doctors_portal");
    const appointmentsCollection = database.collection("appointments");
    const usersCollection = database.collection("users");

    app.get("/appointments", verifyToken, async (req, res) => {
      const email = req.query.email;
      const date = req.query.date;

      const query = { email: email, date: date };

      const cursor = appointmentsCollection.find(query);
      const appointments = await cursor.toArray();
      res.json(appointments);
    });

    app.get("/appointments/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await appointmentsCollection.findOne(query);
      res.json(result);
    });

    app.put("/appointments/:id", async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: {
          payment: payment,
        },
      };
      const result = await appointmentsCollection.updateOne(filter, updateDoc);
      res.json(result);
    });

    app.post("/appointments", async (req, res) => {
      const appointment = req.body;
      const result = await appointmentsCollection.insertOne(appointment);
      sendPlaceAppointmentEmailFunction(appointment);
      res.json(result);
    });

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let isAdmin = false;
      if (user?.role === "admin") {
        isAdmin = true;
      }
      res.json({ admin: isAdmin });
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      console.log(result);
      res.json(result);
    });

    app.put("/users", async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const options = { upsert: true };
      const updateDoc = { $set: user };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.json(result);
    });

    app.put("/users/admin", verifyToken, async (req, res) => {
      const user = req.body;
      const requester = req.decodedEmail;
      if (requester) {
        const requesterAccount = await usersCollection.findOne({
          email: requester,
        });
        if (requesterAccount.role === "admin") {
          const filter = { email: user.email };
          const updateDoc = { $set: { role: "admin" } };
          const result = await usersCollection.updateOne(filter, updateDoc);
          res.json(result);
        }
      } else {
        res
          .status(403)
          .json({ message: "you do not have access to make admin" });
      }
    });

    app.post("/create-payment-intent", async (req, res) => {
      const paymentInfo = req.body;
      const amount = paymentInfo.price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        currency: "usd",
        amount: amount,
        payment_method_types: ["card"],
      });
      sendPaymentEmailFunction(paymentInfo);
      res.json({ clientSecret: paymentIntent.client_secret });
    });
  } finally {
    // await client.close();
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello Doctors portal!");
});

app.listen(port, () => {
  console.log(`listening at ${port}`);
});

// app.get('/users')
// app.post('/users')
// app.get('/users/:id')
// app.put('/users/:id');
// app.delete('/users/:id')
// users: get
// users: post
