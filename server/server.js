
require('./config/config');

const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const {ObjectID} = require('mongodb');

const { mongoose } = require('./db/mongoose');
const { Todo } = require('./models/todo');
const { User } = require('./models/user');
const { authenticate } = require('./middlewares/authenticate');

let app = express();

let port = process.env.PORT;

// body-parser middlewear to send JSON data
app.use(bodyParser.json());


// route for the post request.
app.post('/todos', authenticate, (req, res) => {
  let todo = new Todo({
      text: req.body.text,
      _creator: req.user._id
  });

  todo.save()
      .then((doc) => {
        res.send(doc);
      })
      .catch( e => {
        res.status(400).send(e);
      })

});

// GET route
app.get('/todos', authenticate, (req, res) => {
  Todo.find({
        _creator: req.user._id
      })
      .then((todos) => {
        res.send({todos});
      })
      .catch( (err) => {
        res.status(400).send(err);
      })

});

// GET todos /id
app.get('/todos/:id', authenticate, (req, res) => {
 let id = req.params.id;

  if (!ObjectID.isValid(id)) {
   return res.status(404).send();
  }

  Todo.findOne({
        _id: id,
        _creator: req.user._id
      })
      .then( (todo) => {
        if (!todo) {
          return res.status(404).send()
        }
          res.send({todo}) // same as todo: todo
        
      }).catch( (err) => {
        res.status(404).send();
      })
});

// DELETE /todos/:id
app.delete('/todos/:id', authenticate, (req, res) => {
  let id = req.params.id;

  if(!ObjectID.isValid(id)) {
    return res.status(404).send();
  }

  Todo.findOneAndRemove({
    _id: id,
    _creator: req.user._id
  }).then( (todo) => {
    if(!todo) {
      return res.status(404).send();
    }
      res.send({todo});

  }).catch( (err) => {
    res.status(400).send();
  });
});

// UPDATE /todos/:id
app.patch('/todos/:id', authenticate, (req, res) => {
  let id = req.params.id;
  // lodash method to pull out the properties we want from our doc.
  let body = _.pick(req.body, ['text', 'completed']);

  if(!ObjectID.isValid(id)) {
    return res.status(404).send();
  }

  // lodash method to check if the certain value is boolean or not.
  if (_.isBoolean(body.completed) && body.completed) {
    body.completedAt = new Date().getTime();
  } else {
    body.completed = false;
    body.completedAt = null;
  }

  // query
  Todo.findOneAndUpdate({
      _id: id,
      _creator: req.user._id
    }, {$set: body}, {new: true}).then( (todo) => {
    if (!todo) {
      return res.status(404).send();
    }

    res.send({todo});
  }).catch( (e) => {
    res.status(400).send();
  });

});

// users route
app.post('/users', (req, res) => {
  let body = _.pick(req.body, ['email', 'password']);
  let user = new User(body);

  user.save().then( () => {
    // res.send(user)
    return user.generateAuthToken();

  }).then( token => {
    res.header('x-auth', token).send(user);

  }).catch( e => res.status(400).send(e));
});

// POST /user/login
app.post('/users/login', (req, res) => {
  let body = _.pick(req.body, ['email', 'password']);
  
  User.findByCredentials(body.email, body.password).then( user => {
    return user.generateAuthToken().then( token => {
      res.header('x-auth', token).send(user);
    })
  }).catch( err => {
    res.status(400).send();
  });
});

// GET /users/me
app.get('/users/me', authenticate, (req, res) => {
  res.send(req.user);
});

// DELETE /users/me/token
app.delete('/users/me/token', authenticate, (req, res) => {
  req.user.removeToken(req.token).then( () => {
    res.status(200).send();
  }).catch( () => res.status(400).send());
});


app.listen(port, () => {
  console.log(`Server up on Port ${port}`);
});

module.exports = { app };