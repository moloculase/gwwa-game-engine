			console.log("GWWA game engine has started working adhiyyuahmed@gmail.com V 0.5");
			document.title = titleName;
			console.log("running a game called: " + document.title);
			document.body.style.backgroundColor = bodyBackgroundColor;
			function log(text) {
				console.log(text);
			}
			var myGameArea = {
			    canvas : document.createElement("canvas"),
			    start : function() {
			        this.canvas.style.width = screenWidth;
			        this.canvas.style.height = screenheight;
			        this.canvas.style.backgroundColor = screenBackgroundColor;
			        this.canvas.style.border = screenBorderColor + " " + screenBorderWidth + " " + screenBorderStyle;
			        this.canvas.style.marginLeft = canvasMarginLeft;
			        this.canvas.style.marginRight = canvasMarginRight;
			        this.canvas.style.marginDown = canvasMarginDown;
			        this.canvas.style.marginup = canvasMarginUp;
			        this.context = this.canvas.getContext("2d");
			        document.body.insertBefore(this.canvas, document.body.childNodes[0]);
			        this.frameNo = 0; 
			        this.interval = setInterval(updateGameArea, intervalSpeed);
			        window.addEventListener('keydown', function (e) {
			            myGameArea.keys = (myGameArea.keys || []);
			            myGameArea.keys[e.keyCode] = (e.type == "keydown");
			        })
			        window.addEventListener('keyup', function (e) {
			            myGameArea.keys[e.keyCode] = (e.type == "keydown");            
			        })
			    },
			    clear : function() {
				    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
				},
				stop : function() {
				    clearInterval(this.interval);
				}
			}
			function everyinterval(n) {
			  	if ((myGameArea.frameNo / n) % 1 == 0) {return true;}
			  	return false;
			}
			function draw(props) {
				if (cameraFollowing) {
					if (typeof props.is_camera_follow == 'undefined') {
			    		this.isCameraFollow = false;
				    } else {
				    	this.isCameraFollow = props.is_camera_follow;
				    }	
				}			
				this.colType = props.col_type;
				this.type = props.type;
			    this.width = props.width;
			    this.height = props.height;
			    if (typeof props.angle == 'undefined') {
			    	this.angle = 0;
			    } else {
			    	this.angle = props.angle;
			    }
			    this.color = props.color;
			    if (typeof props.line_color == 'undefined') {
					this.lineColor = this.color;
					this.lineWidth = 1;
				} else {
					this.lineColor = props.line_color;
					this.lineWidth = props.line_width;
				}
			    this.speedX = 0;
  				this.speedY = 0;
  				if (props.is_gravity) {
  					this.gravity = props.gravity;
  					this.gravitySpeed = props.grav_speed;	
  					this.isGravity = true;
  				} else {
  					this.isGravity = false;
  				}
			    this.x = props.x;
			    this.y = props.y;   	
			    this.centerRectX = (this.x + this.width) / 2;
			    this.centerRectY = (this.y + this.height) / 2;
			    if (props.type == "image" || props.type == "img") {
				    this.image = new Image();
				    this.image.src = props.src;
				    this.imgsrc = props.src;
				}	
				if (props.type == "round") {
					this.radius = props.width / 2;
				}    
				if (this.colType !== "null") {
					if (this.colType !== "round") {
						this.colH = props.col_h;						
					}
					if (this.colType == "round") {
						this.colR = props.col_w / 2;
					}
					this.colW = props.col_w;
				}
				if (typeof props.is_dead == 'undefined') {
					this.isDead = false;
				} else {
					this.isDead = props.is_dead;
				}
			    this.update = function(){
			    	if (this.isDead == false) {
			    		ctx = myGameArea.context;
				        ctx.save();
				        ctx.translate(this.x, this.y);  
				       			         
				        ctx.rotate(this.angle);
				        if (props.type == "rect" || props.type == "rectangle") {
				        	ctx.fillStyle = this.color;
				        	ctx.fillRect(this.width / - 2, this.height / - 2, this.width, this.height);
				        	ctx.stroke();  		
				    	} else if (props.type == "img" || props.type == "image") {		    		
				    		ctx.drawImage(this.image,
							this.x,
							this.y,
							this.width, this.height);	    		
				    	} else if (props.type == "round") {
				    		ctx.beginPath();		
				        	ctx.arc(this.x,this.y,this.width,0,2*Math.PI);
				        	ctx.fillStyle = this.color;
				        	ctx.strokeStyle = this.lineColor;
				        	ctx.fill();
				        	ctx.stroke();						
				    	}
				    	ctx.restore(); 
			    	}	        
			    }
				this.newPos = function() {
					if (this.isDead == false) {
						if (this.isGravity) {
							this.gravitySpeed += this.gravity;	
						}
					    this.x += this.speedX;
						
						if (this.isGravity) {
							this.y += this.speedY + this.gravitySpeed;	
						} else {
							this.y += this.speedY;	
						}
					}					
				}
				this.crashWith = function(otherobj) {
					if (this.isDead == false) {
						var crash;
						if (this.colType == "rect" && otherobj.colType == "rect") {
							crash = true;
							var myleft = this.x;
						    var myright = this.x + (this.colW);
						    var mytop = this.y;
						    var mybottom = this.y + (this.colH);
						    var otherleft = otherobj.x;
						    var otherright = otherobj.x + (otherobj.colW);
						    var othertop = otherobj.y;
						    var otherbottom = otherobj.y + (otherobj.colH);				    
						    if ((mybottom < othertop) ||
						    (mytop > otherbottom) ||
						    (myright < otherleft) ||
						    (myleft > otherright)) {
						      crash = false;
						    }
						    return crash;
						} else if (this.colType == "round" && otherobj.colType == "round") {
							var dx = (this.x + this.colR) - (otherobj.x + otherobj.colR);
						    var dy = (this.y + this.colR) - (otherobj.y + otherobj.colR);
						    var distance = Math.sqrt(dx * dx + dy * dy);
							crash = true;
							if (distance > this.colR + otherobj.colR) {
						        crash = false;
						    }
						    return crash;
						} else if(this.colType !== "null") {
							if (this.x == otherobj.x && this.y == otherobj.y) {
								return true;
							} else {
								return false;
							}
						} 		    
					}
				}
				this.getCrashSideY = function(otherobj) {	
					if (this.isDead == false) {			    
				    	var crash;
				    	var myleft = this.x;
					    var myright = this.x + (this.width);
					    var mytop = this.y;
					    var mybottom = this.y + (this.height);
					    var otherleft = otherobj.x;
					    var otherright = otherobj.x + (otherobj.width);
					    var othertop = otherobj.y;
					    var otherbottom = otherobj.y + (otherobj.height);
					    if (mybottom > othertop) {
					    	crash = "bottop";
					    }else if (mytop < otherbottom) {
					    	crash = "topbot";
					    }else {
					    	crash = "null";
					    }
				    	return crash;
					}
				}
				this.getCrashSideX = function(otherobj) {
					if (this.isDead == false) {    
					   	var crash;
					    var myleft = this.x;
						var myright = this.x + (this.width);
						var mytop = this.y;
					    var mybottom = this.y + (this.height);
					    var otherleft = otherobj.x;
					    var otherright = otherobj.x + (otherobj.width);
					    var othertop = otherobj.y;
					    var otherbottom = otherobj.y + (otherobj.height);
					    if (myright > otherleft) {
					    	crash = "rightleft";
					    }else if (myleft < otherright) {
					      	crash = "leftright";
					    }else {
					    	crash = "null";
					    }
				    	return crash;
					}	
				}  
			}	
			function soundPlay(src) {
				var audio = new Audio(src);//only mp3 files
				audio.play();
			}
			function soundPause(src) {
				var audio = new Audio(src);//only mp3 files
				audio.pause();
			}
			function drawText(text, font_size, x, y, align, color, font) {
				ctx = myGameArea.context;
				ctx.font = font_size + "px " + font;
				ctx.fillStyle = color;
				ctx.textAlign = align;
				ctx.fillText(text,x,y);
			}
			function editInnerHTML(type, name, text) {
				if (type == "tag") {
					document.getElementsByTagName(name).innerHTML = text;
				} else if (type == "id") {
					document.getElementById(name).innerHTML = text;
				} else if (type == "class") {
					document.getElementsByClassName(name).innerHTML = text;
				}
			}
			var windowW = window.innerWidth;
			var windowH = window.innerHeight;
			if (getMouseActions == true) {
				var mouseUserY = 0;
				var mouseUserX = 0;
				var lastMouseDownX = 0;
				var lastMouseDownY = 0;
				var lastMouseUpX = 0;
				var lastMouseUpY = 0;
				var isMouseDown = false;
				var hasMouseMoved = false;
				var hasMouseDown = false;
				var mouseUserXOnCanvas = 0;
				var mouseUserYOnCanvas = 0;
				
				onmousemove = function(e){
					mouseUserX = e.clientX;
					mouseUserY = e.clientY;	
					hasMouseMoved = true;
				}
				onmousedown = function(e){
					lastMouseDownX = e.clientX;
					lastMouseDownkY = e.clientY;
					isMouseDown = true;	
					hasMouseDown = true;
				}
				onmouseup = function(e){
					lastMouseUpX = e.clientX;
					lastMouseUpY = e.clientY;	
					isMouseDown = false;
				}
				window.addEventListener('mousemove', function (e) {
			      mouseUserXOnCanvasx = e.pageX;
			      mouseUserYOnCanvas = e.pageY;
			    })
				
			
			}
			var currentKeyDown;
			var currentKeyUp;
			var isKeyDown = false;;
			document.onkeydown = function(e){
			    e = e || window.event;
			    var key = e.which || e.keyCode;
			    currentKeyDown = key;
			    isKeyDown = true;
			}
			document.onkeyup = function(e){
			    e = e || window.event;
			    var key = e.which || e.keyCode;
			    currentKeyDown = key;
			    isKeyDown = false;
			}
			var isOnline = navigator.onLine;
			function updateOnlineStatus() {
				isOnline = navigator.onLine;
			}
			
			function typewriterWrite(txt, speed, el_t, el_id) {
				var i = 0;
				if (i < txt.length) {
					if (el_t == "id") {
						document.getElementById(el_id).innerHTML += txt.charAt(i);
					} else if (el_t == "tag_name" || el_t == "tagName") {
						document.getElementsByTagName(el_id).innerHTML += txt.charAt(i);
					} 
				    
				    i++;
				  	setTimeout(typeWriter, speed);
				}
			}
			function randInt(min, max) {
			  	return Math.floor(Math.random() * (max - min + 1) + min);
			}
			function randChar(min, max, rand_ca) {
				if (max < 27 && min > 0) {
					var r = Math.floor(Math.random() * (max - min + 1) + min);
					switch (r) {
					  case 1:
				return "a";	    
					    break;
					  case 2:
				return "b";	    
					    break;
					  
					  case 3:
				return "c";	    
					    break;
					  case 4:
				return "d";	    
					    break;
					  case 5:
				return "e";	    
					    break;
					  case 6:
				return "f";	    
					    break;
					  
					  case 7:
				return "g";	    
					    break;
					  case 8:
				return "h";	    
					    break;
					  case 9:
				return "i";	    
					    break;
					  case 10:
				return "j";	    
					    break;
					  
					  case 11:
				return "k";	    
					    break;
					  case 12:
				return "l";	    
					    break;
					  case 13:
				return "m";	    
					    break;
					  case 14:
				return "n";	    
					    break;
					  
					  case 15:
				return "o";	    
					    break;
					  case 16:
				return "p";	    
					    break;
					  case 17:
				return "q";	    
					    break;
					  case 18:
				return "r";	    
					    break;
					  
					  case 19:
				return "s";	    
					    break;
					  case 20:
				return "t";	    
					    break;
					  case 21:
				return "u";	    
					    break;
					  case 22:
				return "v";	    
					    break;
					  
					  case 23:
				return "w";	    
					    break;
					  case 24:
				return "s";	    
					    break;
					  case 25:
				return "y";	    
					    break;
					  case 26:
				return "z";	    
					    break;
					  
					  
					}
				}
				
			}
			if (isStorageAllowed) {
				function save(name, value) {
					localStorage.setItem(name, value);
				}
				function read(name) {
					return localStorage.getItem(name);
				}
				function readKey(key) {
					return localStorage.key(key);
				}
				function amountOfStorage() {
					return localStorage.length;
				}
				function remove(name) {
					localStorage.removeItem(name);
				}
				function clearAllStorage() {
					localStorage.clear();
				}
			}

			function confirmBox(txt) {
			  	if (confirm(txt)) {
			    	return true;
			  	} else {
			    	return false;
			  	}
			}
			function textPrompt(txt, defaults) {
			  	let x = prompt(txt, defaults);
			    return x;
			}
			myGameArea.frameNo += 1;
			function updateAllActorsInArray(actor) {
				var i = 0;
				while (i < actor.length){
			        actor[i].update();
			        actor[i].newPos();  
			        i = i + 1; 
			    }
			}
			
