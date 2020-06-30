//var app  = require("express")();
var express = require("express");
var app = express();
var http = require("http").createServer(app);
var io   = require("socket.io")(http);
var fs = require('fs');


var list_of_users= []; //list of just names
var list_of_clients = []; //list of names and sockets
var object_of_sockets; // not an array


var max_turns     = 20;

var game_1_object ={"connected_sockets":[],"player_turn":0,"story":[],"max_turns":max_turns-1,"current_turns":0,"game_status":"active","game_nr":1,"session":Math.random().toString().substring(2,15)};
var game_2_object ={"connected_sockets":[],"player_turn":0,"story":[],"max_turns":max_turns-1,"current_turns":0,"game_status":"active","game_nr":2,"session":Math.random().toString().substring(2,15)};
var game_3_object ={"connected_sockets":[],"player_turn":0,"story":[],"max_turns":max_turns-1,"current_turns":0,"game_status":"active","game_nr":3,"session":Math.random().toString().substring(2,15)};
var game_4_object ={"connected_sockets":[],"player_turn":0,"story":[],"max_turns":max_turns-1,"current_turns":0,"game_status":"active","game_nr":4,"session":Math.random().toString().substring(2,15)};


app.use(express.static(__dirname +"\\nude_pics")); //adding the folder to resources
app.get("/",(req,res)=>{
  res.sendFile(__dirname + "/index.html");
});

function turn_off_game(game_n_object){
  game_n_object["game_status"]="finished";
  io.emit("message",{"game_status":game_n_object["game_status"],"story":game_n_object["story"],"game_nr":game_n_object["game_nr"]});
};
function blank_game(game_n_object){
  game_n_object["connected_sockets"]=[];
  game_n_object["player_turn"]=0;
  game_n_object["story"]=[];
  game_n_object["current_turns"]=0;
  game_n_object["game_status"]="active";
  //new session name for saving text:
  game_n_object["session"] = Math.random().toString().substring(2,15);
  io.emit("message",{"game_status":"blank","game_nr":game_n_object["game_nr"]})
  updating_all();
  //update_game_inputs(game_n_object);
  //update_connected_players_list(game_n_object);
  //console.log(game_1_object);

}
function save_story_to_txt(game_n_object){
  var text_name = 'saved_stories/story_'+game_n_object["game_nr"]+'_'+game_n_object["session"]+'_'+'.txt';
  var last_text =" ";
  try {
    last_text = game_n_object["story"][game_n_object["story"].length - 1]["text"];
  }
  catch(err) {
    console.log("DID NOT SAVE BECAUSE COULD NOT FIND 'TEXT'")
  }
  fs.appendFile(text_name, " " + last_text + " ", function (err) {
  if (err) throw err;
  console.log('Saved!');
});
}


function push_to_next_player(game_n_object){//remember to also do this when a player disconnects
  game_n_object["current_turns"]+=1;
  if(game_n_object["player_turn"]<game_n_object["connected_sockets"].length-1){
    game_n_object["player_turn"]+=1;
  }
  else if(game_n_object["player_turn"]>=game_n_object["connected_sockets"].length-1){
    game_n_object["player_turn"]=0;
  }


  update_game_inputs(game_n_object);
  save_story_to_txt(game_n_object);
  //updating_all();
}

function update_players_in_game(game_n_object){
  var game_n_players = [];
  //console.log(game_n_object);
  game_n_object["connected_sockets"].forEach((item, i) => {
    var player_active = false;
    if( game_n_object["player_turn"]== i ){player_active=true};
    if(item){game_n_players.push({"user_name":item.user_name,"player_active":player_active});};
  });
  return game_n_players;
};
//checks if a particular socket is in a list of sockets
function check_if_socket_in_list_of_sockets(sock,game_n_object){
  var inside=false;
  game_n_object["connected_sockets"].forEach((item, i) => {
    if(sock.id==item.id){inside=true};
  });
  return inside;
};
// function updating user names:
function update_logged_in_list(){
  var clients = io.sockets.clients();
  object_of_sockets = clients.sockets;
  list_of_clients.splice(0, list_of_clients.length);
  list_of_clients = Object.entries(object_of_sockets);
  list_of_users.splice(0, list_of_users.length);
  list_of_clients.forEach((item, i) => {
    if(item[1].user_name){list_of_users.push(item[1].user_name)};
  });
};
// update connected players list, checks if a connected player is in the global list, if not, removes from game.
function update_connected_players_list(game_n_object){
  var new_connected_sockets = [];
  game_n_object["connected_sockets"].forEach((connected_socket, i) => {
    list_of_clients.forEach((global_socket, i) => {
      if(connected_socket.user_name == global_socket[1].user_name){
        new_connected_sockets.push(connected_socket);
      }
    });
  });
  game_n_object["connected_sockets"]=new_connected_sockets;
};
function update_game_inputs(game_n_object){
  var last_txt ="You start the stoopid story:";
  game_n_object["connected_sockets"].forEach((sock, i) => {

    if(game_n_object["player_turn"]==i){
      if(game_n_object["story"].length>0){
        last_txt_arr=(game_n_object["story"][game_n_object["story"].length-1]["text"]).split(" ");
        len = last_txt_arr.length;
        console.log(len)
        console.log(last_txt_arr)
        if(len==0){
          last_txt ="... ";
        }
        else if(len==1){
          last_txt = "... "+last_txt_arr[0];
        }
        else if(len==2){
          last_txt = "... "+last_txt_arr[0]+ " " +last_txt_arr[1];
        }
        else{
          last_txt = "... " + last_txt_arr[len-3]+ " " +last_txt_arr[len-2]+ " "+last_txt_arr[len-1];
        }

      }
      sock.emit("message",{"state":"active","last_txt":last_txt,"game_nr":game_n_object["game_nr"]})
    }
    else{

      sock.emit("message",{"state":"inactive","last_txt":last_txt,"game_nr":game_n_object["game_nr"]})
    }
    if(game_n_object["connected_sockets"].length==0){
      sock.emit("message",{"state":"inactive","last_txt":last_txt,"game_nr":game_n_object["game_nr"]})
    }
  });

};
function updating_all(){
  update_logged_in_list();
  io.emit("update names for clients",list_of_users);
  //console.log(update_players_in_game(game_1_object));
  update_connected_players_list(game_1_object);
  update_connected_players_list(game_2_object);
  update_connected_players_list(game_3_object);
  update_connected_players_list(game_4_object);


  var players_list =[update_players_in_game(game_1_object),update_players_in_game(game_2_object),update_players_in_game(game_3_object),update_players_in_game(game_4_object)]
  io.emit("update_players_in_game",players_list);
}

// the heartbeat
var intervalID = setInterval(()=>{
  //updating_all()
/*  console.log("aaaaaaaaaaaaa")
  console.log(game_1_object["player_turn"])
  console.log(game_1_object["connected_sockets"].length)
  console.log(game_2_object["player_turn"])
  console.log(game_2_object["connected_sockets"].length)
  console.log("aaaaaaaaaaaaa")*/
  // update game_inputs accordingly to whos active and not
  //update_game_inputs(game_1_object);
  /*if (game_1_object["current_turns"] >= game_1_object["max_turns"]){
    game_1_object["player_turn"]==100;
    full_story = "";
    game_1_object["story"].forEach((item, i) => {
      full_story += " " + item["text"]+ " ";
    });

    io.emit("the story",full_story);
  }*/

}, 3000);

function check_if_name_exists(name){
  var valid = false;
  list_of_users.forEach((item, i) => {
    if(item==name){
      valid = true;
    }
  });
  if(name === null || name.match(/^ *$/) !== null){
    valid=true;
  }
  return valid;
}

io.on("connection",(socket)=>{
  var socketName;
  socket.on("connect",()=>{
    console.log("bitchass connected")
  })
  socket.on("login name",(name)=>{
    socketName = name;
    if(check_if_name_exists(name)){
      console.log("aleardy exists");
      updating_all();
      socket.emit("login again",{"login_status":false})
    }
    else{
    console.log("a user  " + name + "  connected.   the socket id = "+socket.id);
    socket.emit("login again",{"login_status":true})
    //list_of_users.push(name);
    socket.user_name = name;
    updating_all();}

  });



  socket.on("disconnect",()=>{
    console.log("user id "+ (socket.id).toString()+ " disconnected------");
    update_logged_in_list();
    io.emit("update names for clients",list_of_users);
    // to not lose game, so that when someone disconnects,the other players are not blocked.
    var game_objects = [game_1_object,game_2_object,game_3_object,game_4_object];
    game_objects.forEach((item, i) => {
      if(check_if_socket_in_list_of_sockets(socket,item) && item["game_status"]=="active" ){

        update_connected_players_list(item);

        push_to_next_player(item);

      }
      else if(check_if_socket_in_list_of_sockets(socket,item) && item["game_status"]=="finished"){
        update_connected_players_list(item);
      }
    });
    var players_list =[update_players_in_game(game_1_object),update_players_in_game(game_2_object),update_players_in_game(game_3_object),update_players_in_game(game_4_object)]
    io.emit("update_players_in_game",players_list);
    updating_all();
/*
    if(check_if_socket_in_list_of_sockets(socket,game_3_object)){
      updating_all();
      push_to_next_player(game_3_object);
    }
    if(check_if_socket_in_list_of_sockets(socket,game_4_object)){
      updating_all();
      push_to_next_player(game_4_object);
    }
    if(check_if_socket_in_list_of_sockets(socket,game_1_object)){
      updating_all();
      push_to_next_player(game_1_object);
    }
    if(check_if_socket_in_list_of_sockets(socket,game_2_object)){
      updating_all();
      push_to_next_player(game_2_object);
    }*/
  });
  //this takes care of the chat messaging
  socket.on("chat message", (id_and_msg)=>{ // a message with socket id and message
    var msg = id_and_msg["msg"];
    var socket_id = id_and_msg["id"];
    player_name = object_of_sockets[socket_id].user_name;
    io.emit("chat message",player_name +": " +msg);
  });




  socket.on("check_in 1",()=>{ //checks in a player into the game
    console.log("a user checked in 1");

    if(!check_if_socket_in_list_of_sockets(socket,game_1_object) ){ // && game_1_object["game_status"]=="active"
      game_1_object["connected_sockets"].push(socket);
      update_game_inputs(game_1_object);
    };
    updating_all();
  });
  socket.on("check_in 2",()=>{ //checks in a player into the game
    console.log("a user checked in 2");

    if(!check_if_socket_in_list_of_sockets(socket,game_2_object)){
      game_2_object["connected_sockets"].push(socket);
      update_game_inputs(game_2_object);
    };
    updating_all();
  });
  socket.on("check_in 3",()=>{ //checks in a player into the game
    console.log("a user checked in 3");

    if(!check_if_socket_in_list_of_sockets(socket,game_3_object)){
      game_3_object["connected_sockets"].push(socket);
      update_game_inputs(game_3_object);
    };
    updating_all();
  });
  socket.on("check_in 4",()=>{ //checks in a player into the game
    console.log("a user checked in 4");

    if(!check_if_socket_in_list_of_sockets(socket,game_4_object)){
      game_4_object["connected_sockets"].push(socket);
      update_game_inputs(game_4_object);
    };
    updating_all();
  });






  socket.on("text submit 1",(txt)=>{ //checks in a player into the game
    //console.log(txt);
    //updating_all();
    var active_gamer = undefined;
    try {
      active_gamer = game_1_object["connected_sockets"][game_1_object["player_turn"]].user_name;
    }
    catch(err) {
      console.log("did not find the active player in  'text submit 1' ");
    }
    if(active_gamer == socket.user_name){
      game_1_object["story"].push({"user_name":socket.user_name,"text":txt});
      if (game_1_object["current_turns"]>=game_1_object["max_turns"]){
        turn_off_game(game_1_object);
      }
      else{
        push_to_next_player(game_1_object);
        updating_all();
      }
    };
  });
  socket.on("text submit 2",(txt)=>{ //checks in a player into the game
    //console.log(txt);
    //updating_all();
    var active_gamer = undefined;
    try {
      active_gamer = game_2_object["connected_sockets"][game_2_object["player_turn"]].user_name;
    }
    catch(err) {
      console.log("did not find the active player in  'text submit 2'");
    }
    if(active_gamer == socket.user_name){
      game_2_object["story"].push({"user_name":socket.user_name,"text":txt});
      if (game_2_object["current_turns"]>=game_2_object["max_turns"]){
        turn_off_game(game_2_object);
      }
      else{
        push_to_next_player(game_2_object);
        updating_all();
      }
    };
  });
  socket.on("text submit 3",(txt)=>{ //checks in a player into the game
    //console.log(txt);
    //updating_all();
    var active_gamer = undefined;
    try {
      active_gamer = game_3_object["connected_sockets"][game_3_object["player_turn"]].user_name;
    }
    catch(err) {
      console.log("did not find the active player in  'text submit 3'");
    }
    if(active_gamer == socket.user_name){
      game_3_object["story"].push({"user_name":socket.user_name,"text":txt});
      if (game_3_object["current_turns"]>=game_3_object["max_turns"]){
        turn_off_game(game_3_object);
      }
      else{
        push_to_next_player(game_3_object);
        updating_all();
      }
    };
  });
  socket.on("text submit 4",(txt)=>{ //checks in a player into the game
    //console.log(txt);
    //updating_all();
    var active_gamer = undefined;
    try {
      active_gamer = game_4_object["connected_sockets"][game_4_object["player_turn"]].user_name;
    }
    catch(err) {
      console.log("did not find the active player in  'text submit 4'");
    }
    if(active_gamer == socket.user_name){
      game_4_object["story"].push({"user_name":socket.user_name,"text":txt});
      if (game_4_object["current_turns"]>=game_4_object["max_turns"]){
        turn_off_game(game_4_object);
      }
      else{
        push_to_next_player(game_4_object);
        updating_all();
      }
    };
  });








  socket.on("new game 1",()=>{
    console.log("new game!");
    blank_game(game_1_object);
  })
  socket.on("new game 2",()=>{
    console.log("new game!");
    blank_game(game_2_object);
  })
  socket.on("new game 3",()=>{
    console.log("new game!");
    blank_game(game_3_object);
  })
  socket.on("new game 4",()=>{
    console.log("new game!");
    blank_game(game_4_object);
  })

});

http.listen(8080, ()=> {
  console.log("listening on :8080");
});
