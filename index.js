const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require("jsonwebtoken");

require('dotenv').config();

const port = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());

//verying jwt token
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized Access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Access' });
        }
        //console.log('decoded', decoded);
        req.decoded = decoded;
        next();
    })
}

//Server Connections
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@wood-peckers.w1yek.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
        await client.connect();
        console.log("Database is connected.");

        const database = client.db('woodpeckersDB');
        const productsCollection = database.collection('products');
        const reviewsCollection = database.collection('reviews');
        const usersCollection = database.collection('users');
        const ordersCollection = database.collection('orders');

        //using jwt token to verify user
        app.post('/signin', async (req, res) => {
            const user = req.body;
            const accessToken = jwt.sign(user, process.env.SECRET_KEY);
            res.send({ accessToken });
        });


        // getting all products
        app.get('/products', async (req, res) => {
            const cursor = productsCollection.find({});
            const products = await cursor.toArray();
            res.send(products);
        });
        // getting single product by id
        app.get("/products/:productId", async (req, res) => {
            const id = req.params.productId;
            const query = { _id: ObjectId(id) };
            const singleProduct = await productsCollection.findOne(query);
            res.send(singleProduct);
        });
        // getting all products
        app.get('/reviews', async (req, res) => {
            const cursor = reviewsCollection.find({});
            const reviews = await cursor.toArray();
            res.send(reviews);
        });
        //adding new review
        app.post("/reviews", async (req, res) => {
            const newReview = req.body;
            console.log(newReview.email);
            const reviews = await reviewsCollection.insertOne(newReview);
            res.json(reviews);
        });
        // getting all users
        app.get('/users', async (req, res) => {
            const cursor = usersCollection.find({});
            const users = await cursor.toArray();
            res.send(users);
        });
        // getting single user
        app.get("/users/:email", verifyJWT, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const email = req.params.email;
            //console.log(email, decodedEmail);
            if (email === decodedEmail) {
                const query = { email: email };
                const user = await usersCollection.findOne(query);
                //const isAdmin = user?.role ? true : false;
                res.json(user);
            } else {
                res.status(403).send({ message: 'Forbidden Access' })
            }
        });
        // creating new users
        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const newUser = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(newUser);
        });

        //adding new order
        app.post("/orders", async (req, res) => {
            const newOrder = req.body;
            const orders = await ordersCollection.insertOne(newOrder);
            res.json(orders);
        });
        // getting all orders
        app.get('/orders', async (req, res) => {
            const cursor = ordersCollection.find({});
            const orders = await cursor.toArray();
            res.send(orders);
        });
        //getting my orders by jwt
        app.get('/myorders', verifyJWT, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const email = req.query.user;
            if (email === decodedEmail) {
                const query = { email: email };
                const cursor = ordersCollection.find(query);
                const orders = await cursor.toArray();
                res.send(orders);
            }
            else {
                res.status(403).send({ message: 'Forbidden Access.' })
            }
        });
        //deleting an order
        app.delete('/orders/:orderId', async (req, res) => {
            const id = req.params.orderId;
            const query = { _id: ObjectId(id) };
            const result = await ordersCollection.deleteOne(query);
            res.send(result);
        });
    }
    finally {
        // await client.close();
    }
}


run().catch(console.dir);

app.get('/', (req, res) => {
    res.send("Welcome to Woodpecker Database!");
})

app.listen(port, () => {
    console.log(`Listening at ${port}`);
})