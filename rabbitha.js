/*jslint node: true */
"use strict";

var amqp = require('amqplib/callback_api');
var dom = require('domain').create();
var exports = module.exports;
var consumeHandler;

/* 
  Generic RMQ configuration
*/
exports.config = {
  url: process.env.AMQP_URL,
  exchange: process.env.AMQP_EXCHANGE,
  inputQueue: {
    name: process.env.AMQP_INPUT_QUEUE,
    routingKey: process.env.AMQP_INPUT_ROUTING_KEY
  },
  outputQueue: {
    routingKey: process.env.AMQP_OUTPUT_ROUTING_KEY
  },
  /* TODO: TLS stuff should be defined in opts */
  opts: {
    heartbeat:5
  },
  exitOnPublish: false
};

var _config = exports.config,
  RESTART_TIMEOUT_MS = 3000;

/*
  When consumer receives a severe exception such as a connection drop out, 
  it needs to be dealt with. Simpy restart the it within the context
  of a domain after a graceful timeout.
*/
function restartOnError(err, cb) {
  console.log("** Error: %s, consumer will restart shortly", err);
  setTimeout( function(){
   dom.run(() => {
    consume(cb);
   });
  }, RESTART_TIMEOUT_MS);
  cb(err, null);
}

/*
  A consumer designed to work with a topic exchange.
  You must always use a named input queue bound to your service,
  and filter messages by a topic 'blah.blah'
  TODO: _config elements are compulsory, throw error if not specified.
*/
function consume(cb) {
  amqp.connect(String(_config.url), _config.opts, function(err, conn) {
    if (err) {
      restartOnError(err, cb);
      return;
    } else {
      conn.createChannel(function(err, ch) {
        if (err) {
          restartOnError(err, cb);
          conn.close();
          return;
        }
        ch.assertExchange(_config.exchange, 'topic', {durable: true});
        ch.assertQueue(_config.inputQueue.name, {durable: true}, function(err, q){
          if (err) {
            restartOnError(err, cb);
            ch.close();
            conn.close();
            return;
          }
          console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", q.queue);
          ch.bindQueue(q.queue, _config.exchange, _config.inputQueue.routingKey);
          ch.consume(q.queue, function(msg) {
            cb(null, msg);
          }, {noAck: true});
        });
      });
    }
  });
}

/*
  Exception trap for handling nasty socket closure exceptions thrown by amqp.node library
*/
dom.on('error', (er) => {
  console.log('** RabbitMQ exception %s, will attempt re-connecting shortly.. **', er);
  setTimeout( function(){
   dom.run(() => {
    consume(consumeHandler);
   }); 
  }, RESTART_TIMEOUT_MS);
});

/*
  Entry point for consumer service 
*/
exports.consume = function(cb) {
  consumeHandler = cb;
  dom.run(() => {
    consume(cb);  
  });
}

/*
  A producer designed to work with a topic exchange.
  The topic you choose in _config.outputQueue.routingKey will become a routing key.
  TODO: _config elements are compulsory, throw error if not specified.
*/
function publish(message, cb) {
  amqp.connect(String(_config.url), _config.opts, function(err, conn) {
    if (err) {
      cb(err);
      return;
    }
    conn.createChannel(function(err, ch) {
      ch.assertExchange(_config.exchange, 'topic', {durable: true});
      ch.publish(_config.exchange, _config.outputQueue.routingKey, new Buffer(message), {persistent: true});
      cb(null);
    });
    if (_config.exitOnPublish) {
      setTimeout(function() { conn.close(); process.exit(0) }, 500);
    }
  });
}

/*
  Entry point for producer service 
*/
exports.publish = function(message, cb) {
  publish(message, cb);
}