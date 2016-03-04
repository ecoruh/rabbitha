# rabbitha
A highly available RabbitMQ wrapper.

## The goal
The goal of this project is to create a thin and robust wrapper around amqplib so that RabbitMQ clients do not crash during service disruptions. Secondly they seemlessly work in a round robbin RabbitMQ cluster.
## Constraints
Currently the interface abstracts a consumer and producer API for a topic exchange. Other types of exchanges or exchange-free queue access are not supported. 
## Features
This wrapper gracefully handles RabbitMQ service restarting (it should not crash).
## Known Issues
- Currently there are a few issues around handling clustering and load balancing, these are being worked on.
- If config objects used are not initialised this may cause ill behaviour or crash. This will be improved in the near future.

## Usage
You need to have a named queue and a routing key for the consumer. You only need to have a routing key for the producer.
### Consumer
```javascript
/*jslint node: true */
"use strict";
var rmq = require('rabbitha');

// Consumer settings
rmq.config.inputQueue.name = 'myQueue';        // default: process.env.AMQP_INPUT_QUEUE
rmq.config.inputQueue.routingKey = 'my.topic'; // default: process.env.AMQP_INPUT_ROUTING_KEY

// When you get data you'll be called back here
var consumeDone = function(err, message) {
  if (err) {
    console.log('** ERROR: ' + err);
  } else {
    console.log('** [REC]: ' + message.content.toString());
  }
};
rmq.consume(consumeDone);
```
### Producer
```javascript
/*jslint node: true */
"use strict";
var rmq = require('rabbitha');

// This is an example of a RMQ publisher/producer

// Producer settings
rmq.config.outputQueue.routingKey = 'my.topic'; // default: process.env.AMQP_OUTPUT_ROUTING_KEY
rmq.config.exitOnPublish = true;                // default: false

var publishDone = function(err){
  if (err) {
    console.log('** Error: ' + error);
  } else {
    console.log('** Publish done!')   
  }
}
rmq.publish( 'transformed data', publishDone);
```
### Configuration
The configuration object is directly accessible from clients. Some of the object members are initialised via environment variables. This is to ensure your project's private information such as credentials are not disclosed.
```javascript
config = {
  url: process.env.AMQP_URL,            // eg. 'amqp://rabbituser:rabbitpassword@rabbit1'
  exchange: process.env.AMQP_EXCHANGE,  // eg. 'myExchange'
  inputQueue: {
    name: process.env.AMQP_INPUT_QUEUE, // eg. 'myQueue'
    routingKey: process.env.AMQP_INPUT_ROUTING_KEY  // eg. 'my.topic'
  },
  outputQueue: {
    routingKey: process.env.AMQP_OUTPUT_ROUTING_KEY // eg. 'my.topic'
  },
  /* These are the options forwarded to amqp connection */
  opts: {
    heartbeat:5
  },
  exitOnPublish: false
};
```
