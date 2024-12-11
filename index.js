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
const lessonsCollections =  client.db('vocab-app').collection('lessons')
const usersCollections =  client.db('vocab-app').collection('users')

app.get('/', (req, res) => {
  res.send('Hello from Server..')
})

// get all lessons
app.get('/lessons', async(req, res) =>{
  const lessons = await lessonsCollections.find().toArray()
  res.send(lessons)
})

app.get('/lesson/:id', async(req, res) =>{
  const id =  req.params.id
  const query =  {_id: new ObjectId(id)}
  const lesson = await lessonsCollections.findOne(query)
  res.send(lesson)
})


//save a user to db
app.put('/user', async(req, res) =>{
  const user = req.body
  const query = {email: user.email}
  const isExist = await usersCollections.findOne(query)
  if(isExist) return res.send(isExist)
  
  const option = {upsert: true}
  const updateDoc = {
    $set: {
      ...user
    }
  }
  const result = await usersCollections.updateOne(query, updateDoc, option)
  res.send(result)
})
//get all users
app.get('/users', async(req, res) =>{
  const users = await usersCollections.find().toArray()
  res.send(users)
})



app.listen(port, () => {
  console.log(`Learn Vocab is running on port ${port}`)
})