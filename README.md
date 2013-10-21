A WAMP Testbed
-----
Can be used for some quick dirty testing of your wamp-enabled application.  
Supports WAMP v1 using AutobahnJS.  
Uses Mongoose to serve pages.  

Howto
------
1. Launch Mongoose
2. Goto localhost:9090 (can be changed in mongoose.conf)
3. Connect to your wamp app URL (do not enter login/pass if there is no authorization on server)
4. Set up prefixes if needed
5. Run RPC calls (only one param for now)
6. Subscribe to pubsub topics, receive/send data
7. All actions are being logged in "Action Log" at the bottom of the page
