const express = require('express')
const app = express()
require('dotenv').config()
const cors = require('cors')
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')

const port = process.env.PORT || 5000

// middleware
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))

app.use(express.json())
app.use(cookieParser())


// Verify Token Middleware
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token
  console.log(token)
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err)
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.user = decoded
    next()
  })
}



//connect mongodb
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.28i6f.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

const dbConnect = async () => {
  try {
    client.connect();
    console.log("Database Connected Successfully✅");

  } catch (error) {
    console.log(error.name, error.message);
  }
}
dbConnect()


// db collections
const lessonsCollections = client.db('vocab-app').collection('lessons')
const usersCollections = client.db('vocab-app').collection('users')

//verify admin
const verifyAdmin = async (req, res, next) => {
  const email = req.user.email;
  const query = { email: email }
  const user = await usersCollections.findOne(query)
  const isAdmin = user?.role == 'admin'
  if (!isAdmin) {
    return res.status(403).send({ message: "forbidden access" })
  }
  next()
}

app.get('/', (req, res) => {
  res.send('Hello from Server..')
})


// authtication
app.post('/jwt', async (req, res) => {
  const user = req.body
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: '365d',
  })
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
  }).send({ success: true })
})
// Logout
app.get('/logout', async (req, res) => {
  try {
    res
      .clearCookie('token', {
        maxAge: 0,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      })
      .send({ success: true })
    console.log('Logout successful')
  } catch (err) {
    res.status(500).send(err)
  }
})


// get all lessons
app.get('/lessons', verifyToken, async (req, res) => {
  const lessons = await lessonsCollections.find().toArray()
  res.send(lessons)
})

// add lesson
app.post('/lesson', verifyToken, verifyAdmin, async (req, res) => {
  const lesson = req.body;
  const result = await lessonsCollections.insertOne(lesson)
  res.send(result)

})

app.get('/lesson/:id', async (req, res) => {
  const id = req.params.id
  const query = { _id: new ObjectId(id) }
  const lesson = await lessonsCollections.findOne(query)
  res.send(lesson)
})


app.patch('/lesson/vocab/:id', async (req, res) => {
  const vocab = req.body
  console.log(vocab);
  const id = req.params.id
  const query = { _id: new ObjectId(id) }

  const result = await lessonsCollections.updateOne(query, { $push: { vocabularies: vocab } });
  res.send(result)
})

//save a user to db
app.put('/user', async (req, res) => {
  const user = req.body
  const query = { email: user.email }
  const isExist = await usersCollections.findOne(query)
  if (isExist) return res.send(isExist)

  const option = { upsert: true }
  const updateDoc = {
    $set: {
      ...user
    }
  }
  const result = await usersCollections.updateOne(query, updateDoc, option)
  res.send(result)
})

//get all users
app.get('/users', async (req, res) => {
  const users = await usersCollections.find().toArray()
  res.send(users)
})

//single user
app.get('/user/:email', async (req, res) => {
  const email = req.params.email
  const query = {email}
  const user = await usersCollections.findOne(query)
  res.send(user)
})

//update user role
app.patch('/user/role/:email', async (req, res) => {
  const email = req.params.email;
  const query = { email }
  const user = req.body;
  const updateDoc = {
    $set: {
      ...user
    }
  }
  const result = await usersCollections.updateOne(query, updateDoc)
  res.send(result)
})



app.listen(port, () => {
  console.log(`Learn Vocab is running on port ${port}`)
})