const CANVAS_WIDTH = 700;
const CANVAS_HEIGHT = 400;
var DETECT_MOUSE = true;
var DETECT_KEYBOARD = true;
const TILES_SIZE = 20;
var fps = 25;
const COLLISION_DETECTION_MODE = "scoped";//"scoped" or "all"
var should_draw_collision_boxes = false;

var canvas = document.getElementById("canvass");
const ctx = canvas.getContext("2d");
var mouse_x = null;
var mouse_y = null;
var mouse_delta = null;
const keys = {};
const mouse_buttons = {};
ctx.imageSmoothingEnabled = false;
const starting_world = "main";
var images = {};
var interval;
var grd = ctx.createLinearGradient(0, 0, 170, 0);
var class_collisions = {};
var dlt = 0;
grd.addColorStop(0, "black");
grd.addColorStop(1, "rgb(152, 3, 252)");

canvas.style.width = CANVAS_WIDTH + "px";
canvas.style.height = CANVAS_HEIGHT + "px";
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;
var current_world_name = null;
var worlds = {
	"main":{
		"actors":[],
		"tiles":{},
		"background_color":"cyan",
		"background_image":null,
		"background_image_scrollable":true,
		"background_image_position":{
			"x":0,
			"y":0,
		},
		"background_image_width":null,
		"background_image_height":null,
		"background_image_affected_by_zoom":true,
		"background_image_scroll_speed":{
			"x":1,
			"y":1,
		},
		"gravity":{
			"x":0,
			"y":0.2,
			"exist":true,
		},
		"medium_drag":{
			"x":0.3,
			"y":0.1,
			"exist":true,
		},
		"always_tiles_load":false,
	},
};
var actor_types = {};
var tile_types = {};
var transition_in_animations = {};
var transition_out_animations = {};
var camera = {
	"x":0,
	"y":0,
	"vx":0,
	"vy":0,
	"resistance":{
		"x":0.2,
		"y":0.2,
	},
	"zoom":1,
	"vzoom":0,
	"zoom_resistance": 0.9,
	"effect_color": null,//"rgba(245, 15, 15, 0.61)",
	"effect_image": null,//"images",
	"clock":0,
	"switch_world_effect_interval":null,
	"shake_interval":null,
	"shake_clock":0,
}
var collision_classes = {}


function radians(x){
	return x * (Math.PI / 180);
}

function degrees(x) {
	return x * (180 / Math.PI);
}

function canvas_clear(){
	ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function load_images(srcs_array){//this so that it does not have to load the image fro every time it is drawn; (hopefully it works that way)
	srcs_array.forEach(element => {
		images[element.substring(0, element.lastIndexOf("."))] = new Image();
		images[element.substring(0, element.lastIndexOf("."))].src = element;
	});
}

//effect types: none, blur
function switch_world(world_name, effect_p="none"){
	function mini_switch(){
		current_world_name = world_name;
		canvas.style.backgroundColor = worlds[current_world_name]["background_color"];
	}
	switch (effect_p.type) {
		case "none":
			mini_switch();
			break;
		case "blur":
			camera.clock = 0;
			camera["direction"] = 1;
			function blur(){
				camera.effect_color = "rgba("+effect_p.color.r+","+effect_p.color.g+","+effect_p.color.b+","+Math.min(camera.clock, 1)+")";
				camera.clock += (effect_p.step ?? 0.1)*camera.direction;
				if (camera.clock >= 1){
					camera.direction = -1;
					mini_switch();
				}
				if (camera.clock <= 0){
					clearInterval(camera.switch_world_effect_interval);
				}
			}
			camera.switch_world_effect_interval = setInterval(blur, effect_p.time);
			break;
		default:
			mini_switch();
			console.log("effect type does not exist, yet.", effect_p.type);
			break;
	}
}

canvas.focus();
switch_world(starting_world);

function start_game(){
	interval = setInterval(game_loop, 1000/fps);
}

function stop_game(){
	clearInterval(interval);
}

function draw_background(){
	let current_world = worlds[current_world_name]
	if (current_world["background_image"] !== null){
		ctx.save();
		if (current_world.background_image_affected_by_zoom){
			ctx.scale(camera.zoom, camera.zoom);
		}
		ctx.drawImage(
			images[current_world["background_image"]],
			current_world.background_image_position.x - ((current_world.background_image_scrollable) ? camera.x*current_world.background_image_scroll_speed.x : 0),
			current_world.background_image_position.y - ((current_world.background_image_scrollable) ? camera.y*current_world.background_image_scroll_speed.y : 0),
			current_world.background_image_width ?? images[current_world["background_image"]].width,
			current_world.background_image_height ?? images[current_world["background_image"]].height,
		);
		ctx.restore();
	}
}

//TILES STUFF
function place_tile(row, column, type_name, world_name=null){
	worlds[world_name ?? current_world_name]["tiles"][String(row)+"x"+String(column)] = type_name;
}

function place_tiles(row1, column1, row2, column2, type_name, world_name=null, make_tile_group=false){
	ix = column1;
	iy = row1;
	while (iy <= row2){
		while (ix <= column2){
			place_tile(iy, ix, type_name, world_name);
			ix++;
		}
		ix = column1;
		iy++;
	}
}

function remove_tile(row, column, world_name=null) {
	worlds[world_name ?? current_world_name]["tiles"][String(row)+"x"+String(column)] = null;
}

function row_to_y(row){//converts tile row to y-coordinate
	return Number(row)*TILES_SIZE;
}

function column_to_x(column){//converts tile column to x-coordinate
	return Number(column)*TILES_SIZE;
}

function y_to_row(y, trunc=true){//converts y-coordinate to tile row
	if (trunc){
		return Math.trunc(Number(y)/TILES_SIZE);
	}
	return Number(y)/TILES_SIZE; 
}

function x_to_column(x, trunc=true){//converts x-coordinate to tile column
	if (trunc){
		return Math.trunc(Number(x)/TILES_SIZE);
	}
	return Number(x)/TILES_SIZE;
}

function is_coordinate_on_screen(x, y){
	return (camera.x <= x && camera.x+canvas.width >= x && camera.y <= y && camera.y+canvas.height >= y);
}

function is_tile_on_screen(row, column){
	let y = row_to_y(row);
	let x = column_to_x(column);
	return box_box_collide(camera.x, camera.y, camera.x+canvas.width/camera.zoom, camera.y+canvas.height/camera.zoom, x, y, x+TILES_SIZE, y+TILES_SIZE);
}

function draw_tiles(){
	ctx.save();
	ctx.scale(camera["zoom"], camera["zoom"]);
	let done_types = {};
	if (worlds[current_world_name]["tiles"].always_tiles_load){
		Object.entries(worlds[current_world_name]["tiles"]).forEach(([key, value]) => {
			if ((value ?? "nothing") !== "nothing"){
				let tmp = key.split("x");
				let element = tile_types[value];
				if (element["image_mode"] === "static"){
					image = images[element["static_image_name"]]
				}else if (value in done_types){
					image = done_types[value];
				}else if (element["image_mode"] === "animated"){
					if (element["animation_clock"] === 0){
						image = images[element["animations"][element["playing_animation"]]["frames"][0][0]];
						element["playing_animation_frame"] = 0;
					}else if (element["animation_clock"] * 1000 / fps >= element["animations"][element["playing_animation"]]["frames"][element["playing_animation_frame"]][1]){
						element["animation_clock"] = 0;
						if ((element["playing_animation_frame"] === element["animations"][element["playing_animation"]]["frames"].length-1) && element["animations"][element["playing_animation"]]["loop"]){
							image = images[element["animations"][element["playing_animation"]]["frames"][0][0]];
							element["playing_animation_frame"] = 0;
						}else if ((element["playing_animation_frame"] === element["animations"][element["playing_animation"]]["frames"].length-1) && !element["animations"][element["playing_animation"]]["loop"]){
							image = images[element["animations"][element["playing_animation"]]["frames"][element["playing_animation_frame"]][0]];
						}else {
							element["playing_animation_frame"]++;
							image = images[element["animations"][element["playing_animation"]]["frames"][element["playing_animation_frame"]][0]];
						}
					}else {
						image = images[element["animations"][element["playing_animation"]]["frames"][element["playing_animation_frame"]][0]];
					}
					element["animation_clock"]++;
					done_types[value] = image;
				}
				ctx.drawImage(
					image,
					column_to_x(tmp[1])-camera["x"],
					row_to_y(tmp[0])-camera["y"],
					TILES_SIZE, TILES_SIZE
				);
			}
		});
	}else {
		Object.entries(worlds[current_world_name]["tiles"]).forEach(([key, value]) => {
			if ((value ?? "nothing") !== "nothing" ){
				let tmp = key.split("x");
				if (is_tile_on_screen(tmp[0], tmp[1])){
					let element = tile_types[value];
					if (element["image_mode"] === "static"){
						image = images[element["static_image_name"]]
					}else if (value in done_types){
						image = done_types[value];
					}else if (element["image_mode"] === "animated"){
						if (element["animation_clock"] === 0){
							image = images[element["animations"][element["playing_animation"]]["frames"][0][0]];
							element["playing_animation_frame"] = 0;
						}else if (element["animation_clock"] * 1000 / fps >= element["animations"][element["playing_animation"]]["frames"][element["playing_animation_frame"]][1]){
							element["animation_clock"] = 0;
							if ((element["playing_animation_frame"] === element["animations"][element["playing_animation"]]["frames"].length-1) && element["animations"][element["playing_animation"]]["loop"]){
								image = images[element["animations"][element["playing_animation"]]["frames"][0][0]];
								element["playing_animation_frame"] = 0;
							}else if ((element["playing_animation_frame"] === element["animations"][element["playing_animation"]]["frames"].length-1) && !element["animations"][element["playing_animation"]]["loop"]){
								image = images[element["animations"][element["playing_animation"]]["frames"][element["playing_animation_frame"]][0]];
							}else {
								element["playing_animation_frame"]++;
								image = images[element["animations"][element["playing_animation"]]["frames"][element["playing_animation_frame"]][0]];
							}
						}else {
							image = images[element["animations"][element["playing_animation"]]["frames"][element["playing_animation_frame"]][0]];
						}
						element["animation_clock"]++;
						done_types[value] = image;
					}
					ctx.drawImage(
						image,
						column_to_x(tmp[1])-camera["x"],
						row_to_y(tmp[0])-camera["y"],
						TILES_SIZE, TILES_SIZE
					);
				}
			}
		});
	}
	ctx.restore();
	dlt++;
}

//ACTORS STUFF
function place_actor(actor_type, x=0, y=0, world_name=null, params={}){
	let actor_in_question = structuredClone(actor_types[actor_type]);
	Object.entries(params).forEach(([key, value]) => {
		actor_in_question[key] = structuredClone(value);
	});
	actor_in_question.x = x ?? actor_in_question.x;
	actor_in_question.y = x ?? actor_in_question.y;
	worlds[world_name ?? current_world_name]["actors"].push(actor_in_question);
	return worlds[world_name ?? current_world_name]["actors"].length-1;
}

function actors(actor_id=null, world_name=null){
	if (actor_id === null){
		return worlds[world_name ?? current_world_name]["actors"];
	}
	return worlds[world_name ?? current_world_name]["actors"][actor_id];
}

function draw_actors(){
	let i = 0;
	let element = null;
	const ACTORS = worlds[current_world_name]["actors"];
	const L = ACTORS.length;
	while (i < L){
		element = ACTORS[i];
		if ((element === "none") || (element === null)){
			i++;
			continue;
		}
		if (element.dead){
			i++;
			continue;
		}
		if (!element.always_appearance_load){
			if (!is_actor_on_screen(i)){
				i++;
				continue;
			}
		}
		let image = null;
		if (element["image_mode"] === "static"){
			image = images[element["static_image_name"]]
		}else if (element["image_mode"] === "animated"){
			if (element["animation_clock"] === 0){
				image = images[element["animations"][element["playing_animation"]]["frames"][0][0]];
				element["playing_animation_frame"] = 0;
			}else if (element["animation_clock"] * 1000 / fps >= element["animations"][element["playing_animation"]]["frames"][element["playing_animation_frame"]][1]){
				element["animation_clock"] = 0;
				if ((element["playing_animation_frame"] === element["animations"][element["playing_animation"]]["frames"].length-1) && element["animations"][element["playing_animation"]]["loop"]){
					image = images[element["animations"][element["playing_animation"]]["frames"][0][0]];
					element["playing_animation_frame"] = 0;
				}else if ((element["playing_animation_frame"] === element["animations"][element["playing_animation"]]["frames"].length-1) && !element["animations"][element["playing_animation"]]["loop"]){
					image = images[element["animations"][element["playing_animation"]]["frames"][element["playing_animation_frame"]][0]];
				}else {
					element["playing_animation_frame"]++;
					image = images[element["animations"][element["playing_animation"]]["frames"][element["playing_animation_frame"]][0]];
				}
			}else {
				image = images[element["animations"][element["playing_animation"]]["frames"][element["playing_animation_frame"]][0]];
			}
			element["animation_clock"]++;
		}
		if (element.screen_locked){
			ctx.rotate(radians(element["angle"] ?? 0));
			ctx.drawImage(
				image,
				element.x,
				element.y,
				element["width"],
				element["height"],
			);
			ctx.restore();
		}else {
			ctx.save();
			ctx.scale(camera["zoom"], camera["zoom"]);
			if ((element.rotation_center ?? "center") === "center"){
				ctx.translate(
					element["x"] + element["width"] / 2 - camera["x"],
					element["y"] + element["height"] / 2 - camera["y"]
				);
			}else {
				ctx.translate(
					element["x"] + element.rotation_center[0] - camera["x"],
					element["y"] + element.rotation_center[1] - camera["y"]
				);
			}
			ctx.rotate(radians(element["angle"] ?? 0));
			ctx.drawImage(
				image,
				-element["width"] / 2,
				-element["height"] / 2,
				element["width"],
				element["height"],
			);
			ctx.restore();
		}
		//collision bounding drawing
		//comment this part out when actual game do
		//
		if (should_draw_collision_boxes){
			ctx.save();
			ctx.scale(camera["zoom"], camera["zoom"]);
			draw_collision_boxes(element, "magenta", element.screen_locked);
			ctx.restore();
		}
		i++;
	}
}

function kill_actor(actor_id, world_name=null){
	worlds[world_name ?? current_world_name]["actors"][actor_id].dead = true;
}

function revive_actor(actor_id, world_name=null) {
	worlds[world_name ?? current_world_name]["actors"][actor_id].dead = false;
}
function delete_actor(actor_id, world_name=null){
	worlds[world_name ?? current_world_name]["actors"][actor_id] = null;
}

function rand_int(min, max){
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function draw_collision_boxes(element, color="magenta", screen_locked=false){
	let actor_collision_bounds = "nothing"
	let c = null;
	if ((element["collision_mode"] === "static") || (element["image_mode"] === "static")){
		actor_collision_bounds = element["static_collisions"] ?? "nothing";
	}else if ((element["collision_mode"] === "dynamic") && (element["image_mode"] === "animated")){
		c = element["animations"][element["playing_animation"]]["frames"][element["playing_animation_frame"]];
		if (c.length < 3){
			return 0;
		}
		actor_collision_bounds = c[2];
	}
	if ((actor_collision_bounds ?? "nothing" )=== "nothing"){
		return 0;
	}
	ctx.strokeStyle = color;
	ctx.fillStyle = "lime";
	actor_collision_bounds.forEach(element2 => {
		ctx.fillRect(element["x"]-(!screen_locked ? camera["x"] : 0), element["y"]-(!screen_locked ? camera["y"] : 0), 5, 5);
		if (element2[0] === "box"){
			ctx.beginPath();
			ctx.rect(
				element2[1]+element["x"]-(!screen_locked ? camera["x"] : 0),
				element2[2]+element["y"]-(!screen_locked ? camera["y"] : 0),
				element2[3],
				element2[4],
			);
			ctx.stroke();
		}else if (element2[0] === "circle"){
			ctx.beginPath();
			ctx.arc(
				element2[1]+element["x"]-(!screen_locked ? camera["x"] : 0),
				element2[2]+element["y"]-(!screen_locked ? camera["y"] : 0),
				element2[3],
				0, 2 * Math.PI
			);
			ctx.stroke();
		}
	});
}

function switch_animation(actor_id, animation_name, world_name=null){
	worlds[world_name ?? current_world_name]["actors"][actor_id]["playing_animation"] = animation_name;
	worlds[world_name ?? current_world_name]["actors"][actor_id]["animation_clock"] = 0;
	worlds[world_name ?? current_world_name]["actors"][actor_id]["playing_animation_frame"] = 0;
}

function round_away_from_zero(x){
  return x > 0 ? Math.ceil(x) : Math.floor(x);
}

function possible_tiles(type, params, world_name=null){
	let result_dict = {};
	if (type === "box"){
		toplx = round_away_from_zero(x_to_column(params[0][0], false));
		toply = round_away_from_zero(y_to_row(params[0][1], false));
		bottomrx = round_away_from_zero(x_to_column(params[1][0], false));
		bottomry = round_away_from_zero(y_to_row(params[1][1], false));
	}else if (type === "circle"){
		cx = params[0];
		cy = params[1];
		r = params[2];
		toplx = round_away_from_zero( x_to_column(cx-r, false));
		toply = round_away_from_zero(y_to_row(cy-r, false));
		bottomrx = round_away_from_zero(x_to_column(cx+r, false));
		bottomry = round_away_from_zero(y_to_row(cy+r, false));
	}
	ix = toplx-1;
	iy = toply-1;
	while (iy <= bottomry){
		while (ix <= bottomrx) {
			if ((worlds[world_name ?? current_world_name]["tiles"][iy+"x"+ix] ?? -1) !== -1){
				result_dict[iy+"x"+ix] = worlds[world_name ?? current_world_name]["tiles"][iy+"x"+ix];
			}
			ix++;
		}
		iy++;
		ix = toplx-1;
	}
	return result_dict;
}

function is_point_in_box(x1, y1, x2, y2, px, py){
	return (
		(px > x1) && (px < x2) && (py > y1) && (py < y2)
	);
}

function box_box_collide(Ax, Ay, ax, ay, Bx, By, bx, by) {
	return (Ax < bx && ax > Bx && Ay < by && ay > By);
}

function triangle_area(ax, ay, bx, by, cx, cy){
	return Math.abs(bx*cy-by*cx-ax*cy+ay*cx+ax*by-ay*bx)/2;
}

function triangle_area_t2(ax, ay, bx, by, cx, cy){
	return Math.abs(bx*cy-by*cx-ax*cy+ay*cx+ax*by-ay*bx);
}

function box_circle_collide(x1, y1, x2, y2, cx, cy, r){
	const minX = Math.min(x1, x2);
	const maxX = Math.max(x1, x2);
	const minY = Math.min(y1, y2);
	const maxY = Math.max(y1, y2);
	const closestX = Math.max(minX, Math.min(cx, maxX));
	const closestY = Math.max(minY, Math.min(cy, maxY));
	const dx = cx - closestX;
	const dy = cy - closestY;
	return (dx * dx + dy * dy) <= (r * r);
}

function circle_circle_collide(cx1, cy1, r1, cx2, cy2, r2){
	return (
		(r1+r2)**2 > (cx1-cx2)**2 + (cy1-cy2)**2
	);
}

function tile_box_type_collision(tilex, tiley, type){
	if (type === "box"){
		return [tilex, tiley, tilex+TILES_SIZE, tiley+TILES_SIZE];
	}else if (type === "bottom_half_box"){
		return [tilex, tiley+TILES_SIZE/2, tilex+TILES_SIZE, tiley+TILES_SIZE];
	}else if (type === "top_half_box"){
		return [tilex, tiley, tilex+TILES_SIZE, tiley+TILES_SIZE/2];
	}else if (type === "left_half_box"){
		return [tilex, tiley, tilex+TILES_SIZE/2, tiley+TILES_SIZE];
	}else if (type === "right_half_box"){
		return [tilex+TILES_SIZE/2, tiley, tilex+TILES_SIZE, tiley+TILES_SIZE];
	}else if (type.charAt(0) === "Q"){
		let values = type.replace("Q", "").split(",");
		return [tilex+Number(values[0]), tiley+Number(values[1]), tilex+Number(values[2]), tiley+Number(values[3])];
	}else {
		return false;
	}
}

function is_object_empty(obj) {
	for (const prop in obj) {
		if (Object.hasOwn(obj, prop)) {
			return false;
		}
	}
	return true;
}

function is_actor_colliding_with_a_tile(actor_id, world_name=null, mode="scoped"){
	let location = [];
	let actor_in_question = worlds[world_name ?? current_world_name]["actors"][actor_id];
	let actor_collision_bounds = null;
	let success = false;
	let sensor = false;
	let tile_name;
	let class_name;
	let j = 0;
	let key = null;
	let value = null;
	actor_collision_bounds = get_actor_collision_bounds(actor_id, world_name, "tile");
	if (actor_collision_bounds === undefined || actor_collision_bounds === null){
		return false;
	}
	if (!actor_in_question.collide_with_tiles){
		return false;
	}
	if (actor_in_question.dead === true){
		return false;
	}
	let tiles_check = {};
	let tmp = {};
	let actor_x = actor_in_question["x"]+(actor_in_question.screen_locked ? camera["x"] : 0)
	let actor_y = actor_in_question["y"]+(actor_in_question.screen_locked ? camera["y"] : 0)
	if (mode === "scoped"){
		actor_collision_bounds.forEach(element => {
			tmp = {};
			if (element[0] === "box"){
				tmp = possible_tiles("box", [
					[element[1]+actor_x, element[2]+actor_y],
					[(element[1]+actor_x+element[3]) ?? (element[1]+actor_in_question["width"]), (element[2]+actor_y+element[4]) ?? (element[2]+actor_in_question["height"])]
				]);
				tiles_check = Object.assign({}, tiles_check, tmp);
			}else if (element[0] === "circle"){
				tmp = possible_tiles("circle", [
					(element[1]+actor_x) ?? (actor_x+actor_in_question["width"]/2),
					(element[2]+actor_y) ?? (actor_x+actor_in_question["height"]/2),
					element[3] ?? ((Math.min(actor_in_question["width"], actor_in_question["height"])/2))]);
				tiles_check = Object.assign({}, tiles_check, tmp);
			}
		});
	}else if (mode === "all"){
		tiles_check = worlds[world_name ?? current_world_name]["tiles"]
	}
	let entrys = Object.entries(tiles_check);
	let len = entrys.length;
	if (is_object_empty(tiles_check)){
		return false;
	}
	while (j < len){
		key = entrys[j][0];
		value = entrys[j][1];
		let tiley = row_to_y(key.split("x")[0]);
		let tilex = column_to_x(key.split("x")[1]);
		let tile_collision_type = tile_types[value]["collision"];
		if (!collision_classes[tile_types[value]["collision_class"]].collide_with_actors){
			j++;
			continue;
		}
		if (collision_classes[tile_types[value]["collision_class"]].ignore_collision_classes === true){
			j++;
			continue;
		}
		let i = 0;
		let l = actor_collision_bounds.length;
		let element = null;
		let tile_bounds = tile_box_type_collision(tilex, tiley, tile_collision_type);
		while (i < l && ((tile_collision_type ?? "none") !== "none")){
			element = actor_collision_bounds[i];
			if (
				collision_classes[tile_types[value]["collision_class"]].ignore_collision_classes.includes(get_col_class_name(element)) ||
				!collision_classes[tile_types[value]["collision_class"]].collide_with_tiles
			){
				i++;
				continue;
			}
			if (tile_bounds === false){
				if ((tile_collision_type === "circle") && (element[0] === "circle")){
					if (circle_circle_collide(
						tilex+TILES_SIZE/2,
						tiley+TILES_SIZE/2,
						tile_types[value]["radius"] ?? (TILES_SIZE/2),
						((element[1]) ?? (actor_in_question["width"]/2)) + actor_x,
						((element[2]) ?? (actor_in_question["height"]/2)) + actor_y,
						element[3] ?? ((Math.min(actor_in_question["width"], actor_in_question["height"])/2))
					)){
						success = true;
						location = [tilex, tiley];
						tile_name = value;
						if (
							tile_types[value].sensor ||
							collision_classes[tile_types[value].collision_class].sensor ||
							collision_classes[get_col_class_name(element)].sensor ||
							actor_in_question.sensor
						){
							sensor = true;
						}
						class_name = get_col_class_name(element);
						break;
					}
				}else if ((tile_collision_type === "circle") && (element[0] === "box")){
					let a = [element[1]+actor_x, element[2]+actor_y]
					let b = [
						(element[3] !== null) ? element[1]+actor_x+element[3] : element[1]+actor_in_question["width"],
						(element[4] !== null) ? element[2]+actor_y+element[4] : element[2]+actor_in_question["height"],
					];
					if (box_circle_collide(
						a[0], a[1], b[0], b[1], tilex+TILES_SIZE/2,
						tiley+TILES_SIZE/2,
						tile_types[value]["radius"] ?? (TILES_SIZE/2),
					)){
						success = true;
						location = [tilex, tiley];
						tile_name = value;
						if (
							tile_types[value].sensor ||
							collision_classes[tile_types[value].collision_class].sensor ||
							collision_classes[get_col_class_name(element)].sensor ||
							actor_in_question.sensor
						){
							sensor = true;
						}
						class_name = get_col_class_name(element);
						break;
					}
				}
			}else {
				if (element[0] === "box"){
					let a = [element[1]+actor_x, element[2]+actor_y]
					let b = [
						(element[3] !== null) ? element[1]+actor_x+element[3] : element[1]+actor_in_question["width"],
						(element[4] !== null) ? element[2]+actor_y+element[4] : element[2]+actor_in_question["height"],
					];
					if (box_box_collide(tile_bounds[0], tile_bounds[1], tile_bounds[2], tile_bounds[3], a[0], a[1], b[0], b[1])){
						success = true;
						location = [tilex, tiley];
						tile_name = value;
						if (
							tile_types[value].sensor ||
							collision_classes[tile_types[value].collision_class].sensor ||
							collision_classes[get_col_class_name(element)].sensor ||
							actor_in_question.sensor
						){
							sensor = true;
						}
						class_name = get_col_class_name(element);
						break;
					}
				}else if (element[0] === "circle"){
					if (box_circle_collide(
					tile_bounds[0], tile_bounds[1],
					tile_bounds[2], tile_bounds[3],
					(element[1] ?? (actor_in_question["width"]/2)) + actor_x,
					(element[2] ?? (actor_in_question["height"]/2)) + actor_y,
					element[3] ?? (Math.min(actor_in_question["width"], actor_in_question["height"])/2)
					)){
						success = true;
						location = [tilex, tiley];
						tile_name = value;
						if (
							tile_types[value].sensor ||
							collision_classes[tile_types[value].collision_class].sensor ||
							collision_classes[get_col_class_name(element)].sensor ||
							actor_in_question.sensor
						){
							sensor = true;
						}
						class_name = get_col_class_name(element);
						break;
					}
				}
			}
			i++;
		}
		if (success === true){
			break;
		}
		j++;
	}
	if (success === false){
		return false;
	}
	
	for (let i = 0; i < collision_classes[tile_types[tile_name].collision_class].on_collide.length; i++) {
		if (collision_classes[tile_types[tile_name].collision_class].on_collide[i][0] === class_name || collision_classes[tile_types[tile_name].collision_class].on_collide[i][0] === true){
			collision_classes[tile_types[tile_name].collision_class].on_collide[i][1]();
		}
	}
	return [success, location, tile_name, sensor];
}

function basically_zero(x, e=10**-1){
	if (Math.abs(x) <= e){
		return 0;
	}
	return x;
}

function average(a, b){
	return (a+b)/2;
}

function m_average(list){
	let sum = 0;
	for (let i = 0; i < list.length; i++) {
		sum += list[i];
	}
	return sum/list.length;
}

function does_actor_exist(actor_id, world_name=null){
	world_name = world_name ?? current_world_name;
	if (worlds[world_name]["actors"].length <= actor_id){
		return false;
	}
	if (worlds[world_name]["actors"][actor_id] ?? "none" === "none"){
		return false;
	}
	return true;
}

function is_actor_on_screen(actor_id, world_name=null){
	world_name = world_name ?? current_world_name;
	let actor_in_question = worlds[world_name]["actors"][actor_id];
	return box_box_collide(actor_in_question.x, actor_in_question.y, actor_in_question.x+actor_in_question.width, actor_in_question.y+actor_in_question.height, camera.x, camera.y, camera.x+canvas.width/camera.zoom, camera.y+canvas.height/camera.zoom);
}

function get_actor_collision_bounds(actor_id, world_name=null, mode){
	const actor_in_question = worlds[world_name ?? current_world_name]["actors"][actor_id];
	var actor_collision_bounds = null;
	if (!weird_clamp(actor_in_question["collide_with_tiles"]) && mode === "tile"){
		return actor_collision_bounds;
	}
	if (!weird_clamp(actor_in_question["collide_with_actors"]) && mode === "actor"){
		return actor_collision_bounds;
	}
	if ((actor_in_question["collision_mode"] === "static") || (actor_in_question["image_mode"] === "static")){
		actor_collision_bounds = actor_in_question["static_collisions"];
	}else if (((actor_in_question["collision_mode"] === "dynamic") && (actor_in_question["image_mode"] === "animated"))){
		actor_collision_bounds = (actor_in_question["animations"][actor_in_question["playing_animation"]]["frames"][actor_in_question["playing_animation_frame"]] ?? [null, null, null])[2];
	}
	return actor_collision_bounds;
}

function weird_clamp(params) {
	if (params === true){
		return true
	}
	return false
}

function get_col_class_name(col_array){
	if (typeof col_array.at(-1) === 'string'){
		return col_array.at(-1);
	}
	return null;
}

function is_actor_col_actor(actor_id1, actor_id2, world_name=null){
	let collided = false;
	let sensor = false;
	world_name = world_name ?? current_world_name;
	let actor1 = worlds[world_name]["actors"][actor_id1];
	let actor2 = worlds[world_name]["actors"][actor_id2];
	let actor1_bounds = get_actor_collision_bounds(actor_id1, world_name, "actor");
	let actor2_bounds = get_actor_collision_bounds(actor_id1, world_name, "actor");
	let actor1_bound = null;
	let actor2_bound = null;
	let ac = null;
	let bc = null;
	let x = 0;
	let y = 0;
	if (!actor1.collide_with_actors || !actor2.collide_with_actors){
		return [collided, sensor];
	}
	if (actor1.dead || actor2.dead){
		return [collided, sensor];
	}
	if (actor_id1 === actor_id2){
		return [collided, sensor];
	}
	let actor1_bounds_l = actor1_bounds.length;
	let actor2_bounds_l = actor2_bounds.length;
	while (x < actor1_bounds_l){
		actor1_bound = actor1_bounds[x];
		ac = get_col_class_name(actor1_bound);
		if (!((collision_classes[ac] ?? {"collide_with_actors": true}).collide_with_actors)){
			x++;
			continue;
		}
		if (collision_classes[ac].ignore_collision_classes === true){
			x++;
			continue;
		}
		let actor1x = actor1.x;
		let actor1y = actor1.y;
		let actor2x = actor2.x;
		let actor2y = actor2.y;
		if (actor1.screen_locked){
			actor1x += camera.x;
			actor1y += camera.y;
		}
		if (actor2.screen_locked){
			actor2x += camera.x;
			actor2y += camera.y;
		}
		while (y < actor2_bounds_l){
			actor2_bound = actor2_bounds[y];
			bc = get_col_class_name(actor2_bound);
			if (!((collision_classes[bc] ?? {"collide_with_actors": true}).collide_with_actors)){
				y++;
				continue;
			}
			if (collision_classes[bc].ignore_collision_classes === true){
				y++;
				continue;
			}
			if (collision_classes[bc].ignore_collision_classes.includes(ac) || collision_classes[ac].ignore_collision_classes.includes(bc)){
				y++;
				continue;
			}
			if (actor1_bound[0] === "circle" && actor2_bound[0] === "circle"){
				if (circle_circle_collide(
					((actor1_bound[1] ?? (actor1.width/2)) + actor1x),
					(actor1_bound[2] ?? (actor1.height/2)) + actor1y,
					actor1_bound[3] ?? (Math.min(actor1.width, actor1.height)/2),
					(actor2_bound[1] ?? (actor2.width/2)) + actor2x,
					(actor2_bound[2] ?? (actor2.height/2)) + actor2y,
					actor2_bound[3] ?? (Math.min(actor2.width, actor2.height)/2),
				)){
					collided = true;
					if ((collision_classes[ac] ?? {"sensor": false}).sensor || (collision_classes[bc] ?? {"sensor": false}).sensor){
						sensor = true;
					}
					break;
				}
			}else if (actor1_bound[0] === "circle" && actor2_bound[0] === "box"){
				if (box_circle_collide(
					actor2_bound[1]+actor2x,
					actor2_bound[2]+actor2y,
					(actor2_bound[3] ?? actor2.width)+actor2_bound[1]+actor2x,
					(actor2_bound[4] ?? actor2.height)+actor2_bound[2]+actor2y,
					(actor1_bound[1] ?? (actor1.width/2)) + actor1x,
					(actor1_bound[2] ?? (actor1.height/2)) + actor1y,
					actor1_bound[3] ?? (Math.min(actor1.width, actor1.height)/2),
				)){
					collided = true;
					if ((collision_classes[ac] ?? {"sensor": false}).sensor || (collision_classes[bc] ?? {"sensor": false}).sensor){
						sensor = true;
					}
					break;
				}
			}else if (actor1_bound[0] === "box" && actor2_bound[0] === "circle"){
				if (box_circle_collide(
					actor1_bound[1]+actor1x,
					actor1_bound[2]+actor1y,
					(actor1_bound[3] ?? actor1.width)+actor1_bound[1]+actor1x,
					(actor1_bound[4] ?? actor1.height)+actor1_bound[2]+actor1y,
					(actor2_bound[1] ?? (actor2.width/2)) + actor2x,
					(actor2_bound[2] ?? (actor2.height/2)) + actor2y,
					actor2_bound[3] ?? (Math.min(actor2.width, actor2.height)/2),
				)){
					collided = true;
					if ((collision_classes[ac] ?? {"sensor": false}).sensor || (collision_classes[bc] ?? {"sensor": false}).sensor){
						sensor = true;
					}
					break;
				}
			}else if (actor1_bound[0] === "box" && actor2_bound[0] === "box"){
				if (box_box_collide(
					actor1_bound[1]+actor1x,
					actor1_bound[2]+actor1y,
					(actor1_bound[3] ?? actor1.width)+actor1_bound[1]+actor1x,
					(actor1_bound[4] ?? actor1.height)+actor1_bound[2]+actor1y,
					actor2_bound[1]+actor2x,
					actor2_bound[2]+actor2y,
					(actor2_bound[3] ?? actor2.width)+actor2_bound[1]+actor2x,
					(actor2_bound[4] ?? actor2.height)+actor2_bound[2]+actor2y,
				)){
					collided = true;
					if ((collision_classes[ac] ?? {"sensor": false}).sensor || (collision_classes[bc] ?? {"sensor": false}).sensor){
						sensor = true;
					}
					break;
				}
			}
			y++;
		}
		y = 0;
		x++
		if (collided){
			break;
		}
	}
	if (actor1.sensor || actor2.sensor){
		sensor = true;
	}
	let actions1 = [];
	let actions2 = [];
	if (ac !== null && collided){
		actions1 = collision_classes[ac].on_collide;
	}
	if (bc !== null && collided){
		actions2 = collision_classes[bc].on_collide;
	}
	actions1.forEach(element => {
		if (element[0] === true){
			element[1]();
		}else if (element[0] === bc){
			element[1]();
		}
	});

	actions2.forEach(element => {
		if (element[0] === true){
			element[1]();
		}else if (element[0] === ac){
			element[1]();
		}
	});

	return [collided, sensor];
}

function is_actor_colliding_with_an_actor(actor_id, world_name=null) {
	world_name = world_name ?? current_world_name;
	let sensor = false;
	let collide = false;
	let tmp_other_actor = null;
	let i = 0;
	const L = worlds[world_name]["actors"].length;
	if (L <= 1){
		return [collide, sensor, i];
	}
	while (i < L){
		if (i === actor_id){
			i++;
			continue;
		}
		tmp_other_actor = is_actor_col_actor(actor_id, i, world_name);
		if (tmp_other_actor[0] === true){
			collide = true;
			sensor = tmp_other_actor[1];
			break;
		}
		i++;
	}
	return [collide, sensor, i];
}

function apply_physics(){
	camera["vx"] *= 2**(-camera["resistance"]["x"]);
	camera["vy"] *= 2**(-camera["resistance"]["y"]);
	camera["vzoom"] *= 2**(-camera["zoom_resistance"]);

	camera["vx"] = basically_zero(camera["vx"], 10**-20);
	camera["vy"] = basically_zero(camera["vy"], 10**-20);
	camera["vzoom"] = basically_zero(camera["vzoom"], 10**-3);

	camera["x"] += camera["vx"];
	camera["y"] += camera["vy"];
	camera["zoom"] += camera["vzoom"];

	const ALL_ACTORS = worlds[current_world_name]["actors"];
	let i = 0;
	let l = ALL_ACTORS.length;
	let actor = null;
	let info = null;
	let info2 = null;
	let push_val = null;
	while (i < l){
		actor = ALL_ACTORS[i] ?? "none";
		if (actor === "none" || actor.dead === true){
			i++;
			continue;
		}
		if (!actor.always_physics_load){
			if (!is_actor_on_screen(i)){
				i++;
				continue;
			}
		}
		if (actor["affected_by_air_resistance"] && worlds[current_world_name]["medium_drag"]["exist"]){
			actor["vx"] *= 2**(-average(actor["air_resistance"]["x"], worlds[current_world_name]["medium_drag"]["x"]));
			actor["vy"] *= 2**(-average(actor["air_resistance"]["y"], worlds[current_world_name]["medium_drag"]["y"]));
		}
		if (actor["affected_by_gravity"] && worlds[current_world_name]["gravity"]["exist"]){
			actor["vy"] += worlds[current_world_name]["gravity"]["y"];
			actor["vx"] += worlds[current_world_name]["gravity"]["x"];
		}
		actor["vx"] = basically_zero(actor["vx"]);
		actor["vy"] = basically_zero(actor["vy"]);
		function collision_stuff(){
			//info[0]: has collided boolean, info[1]: tile location, info[2]: tile name, info[3]: is it a sensor
			//info2[0]: has_collided_boolean, info2[1]: is it a sensor, info[2]: collided with actor id
			let did_something = false;
			if (!actor.swept_collision_mode){
				actor["y"] += actor["vy"];
			}
			info = is_actor_colliding_with_a_tile(i, current_world_name, COLLISION_DETECTION_MODE);
			info2 = is_actor_colliding_with_an_actor(i);
			if (info[3] || info2[1]){
				return did_something;
			}
			if ((info2[0] && !info2[1]) && actor.pushable){
				push_val = average(actor.push_motion_transfer, worlds[current_world_name]["actors"][info2[2]].push_motion_transfer);
				if (Math.abs(actor.vy) > Math.abs(worlds[current_world_name]["actors"][info2[2]].vy)){
					worlds[current_world_name]["actors"][info2[2]].vy = actor.vy*push_val;
				}
				did_something = true;
			}
			if ((info !== false )|| (info2[0] && !info2[1])){
				actor["y"] -= actor["vy"];
				did_something = true;
			}
			if ((info !== false) && !(info2[0] && !info2[1])){
				actor["vy"] = -Math.sign(actor["vy"])*average(actor["bounce"]["y"], tile_types[info[2]]["bounce"]["y"]);
				if (actor.affected_by_friction){
					actor["vx"] *= 2**(-average(actor.friction.x, tile_types[info[2]]["friction"]["x"]));
				}
				did_something = true;
			}else if ((info === false) && (info2[0] && !info2[1])){
				actor["vy"] = -Math.sign(actor["vy"])*average(actor["bounce"]["y"], worlds[current_world_name]["actors"][info2[2]]["bounce"]["y"]);
				if (actor.affected_by_friction){
					actor["vx"] *= 2**(-average(actor.friction.x, worlds[current_world_name]["actors"][info2[2]]["friction"]["x"]));
				}
				did_something = true;
			}else if ((info !== false) && (info2[0] && !info2[1])){
				actor["vy"] = -Math.sign(actor["vy"])*m_average([actor["bounce"]["y"], worlds[current_world_name]["actors"][info2[2]]["bounce"]["y"], tile_types[info[2]]["bounce"]["y"]]);
				if (actor.affected_by_friction){
					actor["vx"] *= 2**(-m_average([actor.friction.x, worlds[current_world_name]["actors"][info2[2]]["friction"]["x"], tile_types[info[2]]["friction"]["x"]]));
				}
				did_something = true;
			}
			if (!actor.swept_collision_mode){
				actor["x"] += actor["vx"];
				did_something = true;
			}
			info = is_actor_colliding_with_a_tile(i, current_world_name, COLLISION_DETECTION_MODE);
			info2 = is_actor_colliding_with_an_actor(i);
			if ((info2[0] && !info2[1]) && actor.pushable){
				push_val = average(actor.push_motion_transfer, worlds[current_world_name]["actors"][info2[2]].push_motion_transfer);
				if (Math.abs(actor.vx) > Math.abs(worlds[current_world_name]["actors"][info2[2]].vx)){
					worlds[current_world_name]["actors"][info2[2]].vx = actor.vx*push_val;
				}
				did_something = true;
			}
			if (((info !== false) || (info2[0] && !info2[1]))){
				actor["x"] -= actor["vx"];
				did_something = true;
			}
			if ((info !== false) && !(info2[0] && !info2[1])){
				actor["vx"] = -Math.sign(actor["vx"])*average(actor["bounce"]["x"], tile_types[info[2]]["bounce"]["x"]);
				if (actor.affected_by_friction){
					actor["vy"] *= 2**(-average(actor.friction.y, tile_types[info[2]]["friction"]["y"]));
				}
				did_something = true;
			}else if ((info === false) && (info2[0] && !info2[1])){
				actor["vx"] = -Math.sign(actor["vx"])*average(actor["bounce"]["x"], worlds[current_world_name]["actors"][info2[2]]["bounce"]["x"]);
				if (actor.affected_by_friction){
					actor["vy"] *= 2**(-average(actor.friction.y, worlds[current_world_name]["actors"][info2[2]]["friction"]["y"]));
				}
				did_something = true;
			}else if ((info !== false) && (info2[0] && !info2[1])){
				actor["vx"] = -Math.sign(actor["vx"])*m_average([actor["bounce"]["x"], worlds[current_world_name]["actors"][info2[2]]["bounce"]["x"], tile_types[info[2]]["bounce"]["x"]]);
				if (actor.affected_by_friction){
					actor["vx"] *= 2**(-m_average([actor.friction.x, worlds[current_world_name]["actors"][info2[2]]["friction"]["x"], tile_types[info[2]]["friction"]["x"]]));
				}
				did_something = true;
			}
			return did_something;
		}
		if (actor["sensor"]){
			actor["x"] += actor["vx"];
			actor["y"] += actor["vy"];
			i++;
			continue;
		}
		if (actor.swept_collision_mode) {
			const steps = Math.ceil(
				Math.max(Math.abs(actor.vx), Math.abs(actor.vy)) /
				actor.swept_collision_mode_step
			);
			const step_x = actor.vx / steps;
			const step_y = actor.vy / steps;
			for (let i = 0; i < steps; i++){
				actor.x += step_x;
				actor.y += step_y;
				if (collision_stuff()) {
					break;
				}
			}
		}else {
			collision_stuff();
		}
		i++;
	}
}

//camera funcs
function move_camera(x, y, center_coord=false){
	const Rx = 2**(-camera.resistance.x);
	const Ry = 2**(-camera.resistance.y);
	if (center_coord){
		camera["vx"] = (1/Rx) * (1 - Rx) * ((x - canvas.width/2) - camera.x);
		camera["vy"] = (1/Ry) * (1 - Ry) * ((y - canvas.height/2) - camera.y);
		return 0;
	}
	camera["vx"] = (1/Rx) * (1 - Rx) * (x - camera.x);
	camera["vy"] = (1/Ry) * (1 - Ry) * (y - camera.y);
	return 0;
}

function zoom_in(target_zoom){
	const R = 2**(-camera.zoom_resistance)
	camera["vzoom"] = (1/R) * (1 - R) * (target_zoom - camera.zoom);
}

function zoom_in_on_coord(x, y, target_zoom) {
	zoom_in(target_zoom);
	move_camera(x, y, true);
}

function draw_camera_specials(){
	if (camera.effect_color !== null){
		ctx.fillStyle = camera.effect_color;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	}
	if (camera.effect_image !== null){
		ctx.drawImage(images[camera.effect_image], 0, 0);
	}
}

function camera_shake(ix, iy, time){
	camera.shake_clock = 0;
	let done = false;
	setTimeout(function (){done = true; clearInterval(camera.shake_interval);}, time);
	camera.shake_interval = setInterval(function (){
		if (!done){
		if (camera.shake_clock % 2 == 0){
			camera.x += ix;
			camera.y += iy;
		}else {
			camera.x -= ix;
			camera.y -= iy;
		}
		camera.shake_clock++;}
	}, 1000/fps);
}

//CREATE

function cr_collision_element(type, col_class, x, y, z, w=null){
	if (col_class === null){
		if (type === "box"){
			return ["box", x, y, z, w];
		}
		if (type === "circle"){
			return ["circle", x, y, z];
		}
	}
	if (!(col_class in collision_classes)){
		console.log("collision class does not exist: ", col_class);
		return null;
	}
	if (type === "box"){
		return ["box", x, y, z, w, col_class];
	}
	if (type === "circle"){
		return ["circle", x, y, z, col_class];
	}
	console.log("incorrect collision type, has to be either box or circle", type);
	return null;
}

function cr_frame(image_name, ms, collision_element=null){
	if (collision_element === null){
		return [image_name, ms];
	}
	return [image_name, ms, collision_element];
}

function cr_animation(frames_array, loop){
	return {
		"frames":frames_array,
		"loop":loop,
	};
}

function cr_actor_type(name, p) {
	actor_types[name] = {
		"image_mode": p.image_mode ?? "static",//'static' / 'animated'
		"static_image_name": p.static_image_name ?? null,//string image name
		"collision_mode": p.image_mode ?? "static",//'static' / 'dynamic'
		"swept_collision_mode": p.swept_collision_mode ?? false,//true / false
		"swept_collision_mode_step": p.swept_collision_mode_step ?? 1,// an integer
		"static_collisions": p.static_collisions ?? null,//[]
		"width": p.width,//number
		"height": p.height,//number
		"angle": p.angle ?? 0,//number in degrees
		"rotation_center": p.rotation_center ?? "center", //[number, number] / 'center' (coordinates in relation to top left of actor)
		"collide_with_tiles": p.collide_with_tiles ?? true,//boolean
		"collide_with_actors": p.collide_with_actors ?? true,//boolean
		"sensor": p.sensor ?? false,//boolean
		"dead": p.dead ?? false,//boolean
		"playing_animation": p.playing_animation ?? null,//string that is a name of a animation in `animations`
		"playing_animation_frame": p.playing_animation_frame ?? 0,//integer
		"animation_clock": p.animation_clock ?? 0,//number
		"always_physics_load": p.always_physics_load ?? false,//boolean, when it is true: makes it so that the physics of it are applied even when off screen
		"always_appearance_load": p.always_appearance_load ?? false,//boolean, when it is true: makes it so that the appearance of it are applied even when off screen
		"animations": p.animations ?? {},
		"vx": p.vx ?? 0,//number velocity in x direction
		"vy": p.vy ?? 0,//number velocity in y direction
		"air_resistance":{
			"x": p.air_resistance.x ?? 0,//air resistance in x direction, 0 is no resistance contribution to medium_drag
			"y": p.air_resistance.x ?? 0,//air resistance in y direction, 0 is no resistance contribution to medium_drag
		},
		"friction":{
			"x": p.friction.x ?? 0,//friction in x direction, 0 is no friction contribution
			"y": p.friction.y ?? 0,//friction in y direction, 0 is no friction contribution
		},
		"bounce":{
			"x": p.bounce.x ?? 0,//`bounciness` in x direction, 0 is no bounciness contribution
			"y": p.bounce.y ?? 0,//`bounciness` in y direction, 0 is no bounciness contribution
		},
		"affected_by_gravity": p.affected_by_gravity ?? false,//boolean
		"affected_by_air_resistance": p.affected_by_air_resistance ?? false,//boolean
		"affected_by_friction": p.affected_by_friction ?? false,//boolean
		"pushable": p.pushable ?? false,//boolean
		"push_motion_transfer": p.push_motion_transfer ?? 0,//contributes to the velocity it should transfer to the collided actor, 0 is no contribution
		"screen_locked": p.screen_locked ?? false,//makes it act like a HUD element
	};
}

function cr_tile_type(name, p){
	tile_types[name] = {
		"image_mode": p.image_mode ?? "static",//'static' / 'animated'
		"static_image_name": p.static_image_name ?? null,//string image name
		"collision": p.collision ?? "none",//'box' / 'circle' / 'none' / 'bottom_half_box' / 'top_half_box' / 'top_half_box' / 'left_half_box' / 'right_half_box'
		"collision_class": p.collision_class,//string
		"sensor": p.sensor ?? false,//boolean
		"playing_animation_frame": p.playing_animation_frame ?? 0,
		"playing_animation": p.playing_animation ?? null,//string
		"animation_clock": p.animation_clock ?? 0,
		"animations": p.animations ?? {},
		"friction":{
			"x": p.friction.x ?? 0,
			"y":p.friction.y ?? 0,
		},
		"bounce":{
			"x": p.bounce.x ?? 0,
			"y": p.bounce.y ?? 0,
		}
	}
}

function cr_collision_class(name, p){
	collision_classes[name] = {
		"collide_with_tiles": p.collide_with_tiles ?? true,
		"collide_with_actors": p.collide_with_actors ?? true,
		"ignore_collision_classes": p.ignore_collision_classes ?? [],//put true for all, put [] for none
		"sensor": p.sensor ?? false,
		"on_collide":[],//["collision_class_name", function], ... (activates when a certain collision class collides with it)
	}
}

function cr_world(name, p){
	worlds[name] ={
		"actors": p.actors ?? [],
		"tiles": p.tiles ?? {},
		"background_color": p.background_color ?? "white",
		"background_image": p.background_image ?? null,
		"background_image_scrollable": p.background_image_scrollable ?? false,
		"background_image_position":{
			"x": p.background_image_position.x ?? 0,
			"y": p.background_image_position.y ?? 0,
		},
		"background_image_width": p.background_image_width ?? null,
		"background_image_height": p.background_image_height ?? null,
		"background_image_affected_by_zoom": p.background_image_affected_by_zoom ?? false,
		"background_image_scroll_speed":{
			"x": p.background_image_scroll_speed.x ?? 0,
			"y": p.background_image_scroll_speed.y ?? 0,
		},
		"gravity":{
			"x": p.gravity.x ?? 0,
			"y": p.gravity.y ?? 0,
			"exist": p.gravity.exist ?? true,
		},
		"medium_drag":{
			"x": p.medium_drag.x ?? 0,
			"y": p.medium_drag.y ?? 0,
			"exist": p.medium_drag.exist ?? true,
		},
		"always_tiles_load": p.always_tiles_load ?? false,
	}
}

//drawing //in world drawing
function dr_image(image_name, x, y, width, height, locked_to_screen){}