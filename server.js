const express = require('express');
const cors = require('cors');
const knex = require('knex');
const bcrypt = require('bcryptjs');
const { response } = require('express');
const Clarifai = require('clarifai');

const db = knex({
    client: 'pg',
    connection: {
      connectionString : process.env.DATABASE_URL,
      ssl: true
    }
});

db.select('*').from('users');

const app = express();
app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
    res.send('it is working ! !');
})

app.post('/signin', (req, res) => {
    db.select('email', 'hash').from('login')
    .where('email', '=', req.body.email)
    .then(data => {
        const isValid = bcrypt.compareSync(req.body.pwd, data[0].hash);
        if (isValid) {
            return db.select('*').from('users')
            .where('email', '=', req.body.email)
            .then(user => {
                res.json(user[0])
            })
            .catch(err => res.status(400).json('unable to sign in'))
        }else{
            res.status(400).json('wrong email or password')
        }
    })
    .catch(err => res.status(400).json('wrong email or password'))
})

app.post('/register', (req, res) => {
    const { email, pwd, name } = req.body;
    if ( !email || !pwd || !name ) {
        return res.status(400).json('incorrect or incompletly register information');
    }
    const hash = bcrypt.hashSync(pwd, 10);
    db.transaction( trx => {
        trx.insert({ 
            hash: hash, 
            email: email
        })
        .into('login')
        .returning('email')
        .then( loginEmail => {
            return trx('users')
                .returning('*')
                .insert({
                    email: loginEmail[0],
                    name: name,
                    joined: new Date()
            })
            .then(user => {
                res.json(user[0]);
            })
        })
        .then(trx.commit)
        .catch(trx.rollback);
    })
    .catch(err => { res.status(400).json('unable to register') });
})

app.get('/profile/:id', (req, res) => {
    const { id } = req.params;
    db.select('*').from('users').where({id})
        .then(user => {
            if (user.length){
                res.json(user[0])
            }else{
                res.status(400).json('Not found')
            }
        })
        .catch(err => res.status(400).json('error getting user'))
})

app.put('/image', (req, res) => {
    const { id } = req.body;
    db('users').where('id', '=', id).increment('entries', 1).returning('entries')
    .then( entries => {
        res.json(entries[0]);
    })
    .catch(err => res.status(400).json('error getting entries'))
})

app.listen(process.env.PORT || 3000, ()=>{
    console.log('app is running on port `${process.env.PORT}` ');
})