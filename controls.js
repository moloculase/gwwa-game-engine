if (DETECT_MOUSE ?? true){
	function get_mouse_position(canvas, event) {
		const rect = canvas.getBoundingClientRect();
		return {
			x: (event.clientX - rect.left) * (canvas.width / rect.width),
			y: (event.clientY - rect.top) * (canvas.height / rect.height)
		};
	}
	canvas.addEventListener("mousemove", e => {
		const { x, y } = get_mouse_position(canvas, e);
		mouse_x = x;
		mouse_y = y;
	});
	canvas.addEventListener("contextmenu", e => {
		e.preventDefault();
	});
	window.addEventListener("mousedown", e => {
		if (e.button === 0){
			mouse_buttons["left"] = true;
		}
		if (e.button === 1){
			mouse_buttons["middle"] = true;
		}
		if (e.button === 2){
			mouse_buttons["right"] = true;
		}
	});
	window.addEventListener("mouseup", e => {
		if (e.button === 0){
			mouse_buttons["left"] = true;
		}
		if (e.button === 1){
			mouse_buttons["middle"] = true;
		}
		if (e.button === 2){
			mouse_buttons["right"] = true;
		}
	});
	canvas.addEventListener("wheel", e => {
		e.preventDefault();
		mouse_delta = Math.sign(e.deltaY);
	}, { passive: false });

	function in_world_mouse_pos(){
		return [
			(mouse_x+camera["x"])/camera.zoom,
			(mouse_y+camera["y"])/camera.zoom,
		];
	}
}

if (DETECT_KEYBOARD ?? true){
	window.addEventListener("keydown", e => {
		e.preventDefault();
		keys[e.code] = true;
	});
	window.addEventListener("keyup", e => {
		e.preventDefault();
		keys[e.code] = false;
	});
}