const express = require('express')
const app = express()
require('dotenv').config()
const cors = require('cors')
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')

const port = process.env.PORT || 5000;

// middleware

const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://vocab-app-1e62c.web.app',
    'https://vocab-app-1e62c.firebaseapp.com'
  ],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions))
app.use(express.json());
app.use(cookieParser());

// Verify Token Middleware
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token
  // console.log(token)
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      // console.log(err)
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
const tutorialsCollections = client.db('vocab-app').collection('tutorials')

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

app.delete('/lesson/delete/:id', async (req, res) => {
  const id = req.params.id
  const query = { _id: new ObjectId(id) }
  const result = await lessonsCollections.deleteOne(query)
  res.send(result)
})


app.patch('/lesson/vocab/:id', async (req, res) => {
  const vocab = req.body
  // console.log(vocab);
  const id = req.params.id
  const query = { _id: new ObjectId(id) }

  const result = await lessonsCollections.updateOne(query, { $push: { vocabularies: vocab } });
  res.send(result)
})


app.get('/vocab/:id/:pronunciation', async (req, res) => {
  const { id, pronunciation } = req.params;
  const lesson = await lessonsCollections.findOne({ _id: new ObjectId(id) });
  const vocab = lesson.vocabularies.find(
    (v) => v.pronunciation === pronunciation
  );
  if (vocab) {
    res.send(vocab)
  }

})
app.patch('/vocab/update/:id/:pronunciation', async (req, res) => {
  const vocab = req.body;
  const { id, pronunciation } = req.params;

  const lesson = await lessonsCollections.findOne({ _id: new ObjectId(id) });

  if (!lesson) {
    return res.send({ message: "Lesson not found" });
  }
  const vocabIndex = lesson.vocabularies.findIndex(
    (v) => v.pronunciation === pronunciation
  );

  if (vocabIndex === -1) {
    return res.send({ message: "Vocabulary not found" });
  }

  const result = await lessonsCollections.updateOne(
    { _id: new ObjectId(id), "vocabularies.pronunciation": pronunciation },
    { $set: { "vocabularies.$": vocab } }
  );

  res.send(result);
});

//delete vocab
app.delete('/vocab/delete/:id/:pronunciation', async (req, res) => {
  const { id, pronunciation } = req.params;
  const query = {
    _id: new ObjectId(id),
    "vocabularies.pronunciation": pronunciation
  };

  const result = await lessonsCollections.updateOne(
    query,
    { $pull: { vocabularies: { pronunciation } } }
  );

  res.send(result)
});


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
  const query = { email }
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


//get all tut
app.get('/tutorials', async (req, res) => {
  const tutorials = await tutorialsCollections.find().toArray()
  res.send(tutorials)
})


// own auth system
app.post('/register', async (req, res) => {
  const { name, email, img, password, role } = req.body;


  const userExists = await usersCollections.findOne({ email });
  if (userExists) {
    return res.status(400).json({ message: 'User already exists' });
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create and save the new user
  const newUser = {
    name,
    email,
    img,
    role,
    password: hashedPassword,
  };

  const result = await usersCollections.insertOne(newUser);
  res.send(result)
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Check if user exists
  const user = await usersCollections.findOne({ email });
  if (!user) {
    return res.status(400).json({ message: 'No user Found for this mail' });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }
  const payload = {
    email: user.email,
    id: user._id,  // Add the user ID or any relevant data to the payload
  };

  const token = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: '1h', // Set the expiration time
  });
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
  }).send({ success: true })

});

// Logout
app.post('/logout', async (req, res) => {
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

app.get('/protected', verifyToken, async (req, res) => {
  const user = await usersCollections.findOne({ email: req?.user?.email });
  res.send(user);
});

app.listen(port, () => {
  console.log(`Learn Vocab is running on port ${port}`)
})