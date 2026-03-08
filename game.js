load_images(["a.png", "c.png", "pixel_grid.png", "images.png","y.png"])

tile_types["default"] = {
	"image_mode":"static",
	"static_image_name":"a",
	"collision":"box",//put "none" for no collision
	"collision_class":"gwwa",
	"sensor":false,
	"playing_animation_frame":0,
	"playing_animation":"default",
	"animation_clock":0,
	"animations":{
		"default":{
			"frames":[
			["c", 1000],
			["a", 1000]
			],
			"loop":true,
		},
	},
	"friction":{
		"x":0.4,
		"y":1,
	},
	"bounce":{
		"x":0,
		"y":0,
	}
}
place_tile(0, 0, "default");
place_tile(1, 6, "default");
place_tiles(20, -20, 20, 30, "default");
place_tile(0, 1, "default");
place_tile(-1, -6, "default");
place_tile(-1, -7, "default");
place_tile(-1, -8, "default");
place_tile(-2, -6, "default");
place_tile(-3, -6, "default");

function hi(){
	console.log("hi");
}

function bye(){
	console.log("bye");
}

collision_classes["gwwa"] = {
	"collide_with_tiles":true,
	"collide_with_actors":true,
	"ignore_collision_classes":[],//put true for all, put [] for none
	"sensor":false,
	"on_collide":[],
}


actor_types["player"] = {
	"image_mode":"static",
	"static_image_name":"pixel_grid",
	"collision_mode":"static",
	"swept_collision_mode":false,
	"swept_collision_mode_step":1,
	"static_collisions":[["box", 0, 0, 50, 50, "gwwa"]],
	"width":50,
	"height":50,
	"angle":0,
	"rotation_center":"center", //[0, 9]
	"collide_with_tiles":true,
	"collide_with_actors":true,
	"sensor":false,
	"dead":false,
	"playing_animation":"default",
	"playing_animation_frame":0,
	"animation_clock":0,
	"always_physics_load":true,
	"always_appearance_load":true,
	"animations":{
		"default":{
			"frames":[
			["c", 1000],
			["a", 1000]
			],
			"loop":true,
		},
		"default2":{
			"frames":[
			["a", 1000, ["box", 0, 0, 50, 50]],
			["pixel_grid", 3010, ["box", 0, 0, 50, 50]]
			],
			"loop":true,
		},
	},
	"vx":0,
	"vy":0,
	"air_resistance":{
		"x":0,
		"y": 0,
	},
	"friction":{
		"x":0.2,
		"y":1,
	},
	"bounce":{
		"x":0,
		"y":0,
	},
	"affected_by_gravity":true,
	"affected_by_air_resistance":true,
	"affected_by_friction":true,
	"pushable":true,
	"push_motion_transfer":0.5,
	"screen_locked":false,
};
place_actor("player", 30, 50);
place_actor("player", 200, 0);
let last = false;
function game_loop() {
	canvas_clear();
	if (keys["KeyD"]){
		actors()[1]["vx"] += 2;
	}
	if (keys["KeyA"]){
		actors()[1]["vx"] -= 2;
	}
	if (keys["KeyW"] && !last){
		actors()[1]["vy"] -= 8;
		last = true;
	}
	if (!keys["KeyW"]){
		last = false;
	}
	if (keys["KeyS"]){
		actors()[1]["vy"] += 2;
	}

	if (keys["KeyI"]) {
		camera["vy"] -= 1;
	}
	if (keys["KeyK"]){
		camera["vy"] += 1;
	}
	if (keys["KeyL"]){
		camera["vx"] += 1;
	}
	if (keys["KeyJ"]){
		camera["vx"] -= 1;
	}

	if (keys["KeyM"]){
		switch_animation(0, "default2");
	}
	if (keys["KeyN"]){
		switch_animation(0, "default");
	}
	if (keys["KeyX"]){
		actors(0)["x"] = in_world_mouse_pos()[0];
		actors(0)["y"] = in_world_mouse_pos()[1];
		//console.log(in_world_mouse_pos());
	}
	//console.log(is_actor_col_actor(0, 1));
	draw_background();
	apply_physics();
	draw_tiles();
	draw_actors();
	draw_camera_specials();
}

start_game();