const gridThickness = 0.005;
const axisThickness = 0.01;
const lineThickness = 0.01;
const gridRadius = 0.01;
const axisRadius = 0.015;
const gridStyle = "black";
const axisStyle = "red";
const lineStyle = "green";
const scrollAmount = 1.1;

var canvas;
var context;

class Mouse {
	constructor(x, y, left, right) {
		this.x = x;
		this.y = y;
		this.left = left;
		this.right = right;
	}
}

var mouse = new Mouse(0, 0, false, false);
var slope = -1/2;

class vec3 {
	// x, y, and z are numbers
	constructor(x, y, z) {
		this.x = x;
		this.y = y;
		this.z = z;
	}

	static add(a, b) {
		return new this(a.x + b.x, a.y + b.y, a.z + b.z);
	}

	static multiply(vector, scalar) {
		return new this(vector.x * scalar, vector.y * scalar, vector.z * scalar);
	}

	static dot(a, b) {
		return a.x * b.x + a.y * b.y + a.z * b.z;
	}
}

class mat3 {
	// x, y, and z are vec3s
	constructor(x, y, z) {
		this.x = x;
		this.y = y;
		this.z = z;
	}

	transpose() {
		return new mat3(new vec3(this.x.x, this.y.x, this.z.x), new vec3(this.x.y, this.y.y, this.z.y), new vec3(this.x.z, this.y.z, this.z.z));
	}

	static identity() {
		return new this(new vec3(1, 0, 0), new vec3(0, 1, 0), new vec3(0, 0, 1));
	}

	static translate(x, y) {
		return new this(new vec3(1, 0, x), new vec3(0, 1, y), new vec3(0, 0, 1));
	}

	static scale(x, y) {
		return new this(new vec3(x, 0, 0), new vec3(0, y, 0), new vec3(0, 0, 1));
	}

	static rotate(angle) {
		return new this(new vec3(Math.cos(angle), Math.sin(angle), 0), new vec3(-Math.sin(angle), Math.cos(angle), 0), new vec3(0, 0, 1));
	}

	static multiply(a, b) {
		const c = b.transpose();
		return new this(new vec3(vec3.dot(a.x, c.x), vec3.dot(a.x, c.y), vec3.dot(a.x, c.z)),
		                new vec3(vec3.dot(a.y, c.x), vec3.dot(a.y, c.y), vec3.dot(a.y, c.z)),
		                new vec3(vec3.dot(a.z, c.x), vec3.dot(a.z, c.y), vec3.dot(a.z, c.z)));
	}

	static multiplyVector(matrix, vector) {
		return new vec3(vec3.dot(matrix.x, vector), vec3.dot(matrix.y, vector), vec3.dot(matrix.z, vector));
	}
}


var camera = mat3.identity();

function draw() {

	// Setup normalized device coordinates.
	const unit = canvas.width / 2;
	const aspect = canvas.width / canvas.height;
	context.setTransform(unit, 0, 0, unit, canvas.width / 2, canvas.height / 2);

	// Clear screen.
	context.clearRect(-1, -1 / aspect, 2, 2 / aspect);

	// Draw grid.
	for (var i = -10; i <= 10; i++) {
		context.lineWidth = i == 0 ? axisThickness : gridThickness;
		context.strokeStyle = i == 0 ? axisStyle : gridStyle;
		const a = mat3.multiplyVector(camera, new vec3(i, -10, 1));
		const b = mat3.multiplyVector(camera, new vec3(i,  10, 1));
		context.beginPath();
		context.moveTo(a.x, a.y);
		context.lineTo(b.x, b.y);
		context.stroke();
	}
	for (var i = -10; i <= 10; i++) {
		context.lineWidth = i == 0 ? axisThickness : gridThickness;
		context.strokeStyle = i == 0 ? axisStyle : gridStyle;
		const a = mat3.multiplyVector(camera, new vec3(-10, i, 1));
		const b = mat3.multiplyVector(camera, new vec3( 10, i, 1));
		context.beginPath();
		context.moveTo(a.x, a.y);
		context.lineTo(b.x, b.y);
		context.stroke();
	}

	// Draw lattice nodes.
	for (var i = -10; i <= 10; i++)
		for (var j = -10; j <= 10; j++) {
			context.fillStyle = i == 0 || j == 0 ? axisStyle : gridStyle;
			const position = mat3.multiplyVector(camera, new vec3(i, j, 1));
			context.beginPath();
			context.arc(position.x, position.y, i == 0 || j == 0 ? axisRadius : gridRadius, 0, 2 * Math.PI, false);
			context.fill();
		}

	// Draw projection plane.
	const a = mat3.multiplyVector(camera, new vec3(-10, -10 * slope, 1));
	const b = mat3.multiplyVector(camera, new vec3( 10,  10 * slope, 1));
	context.lineWidth = lineThickness;
	context.strokeStyle = lineStyle;
	context.beginPath();
	context.moveTo(a.x, a.y);
	context.lineTo(b.x, b.y);
	context.stroke();

	// TODO Unit square moveable with middle mouse button.
	// TODO Draw the orthogonal line as well.
	// TODO Project square onto the orthogonal line.
	// TODO Multiply that projected region by the original line to get sliver of lattice.
	// TODO Highlight all nodes within that region.
	// TODO Project those points onto the original line.
}

window.addEventListener("load", event => {
	canvas = document.getElementById("canvas");
	context = canvas.getContext("2d");
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	draw();

	canvas.addEventListener("contextmenu", event => event.preventDefault());

	canvas.addEventListener("wheel", event => {
		const amount = Math.pow(scrollAmount, -event.deltaY / 100);
		camera = mat3.multiply(mat3.scale(amount, amount), camera);
		draw();
	});

	canvas.addEventListener("mousemove", event => {
		const unit = canvas.width / 2;
		const aspect = canvas.width / canvas.height;
		mouse.x = event.offsetX / unit - 1;
		mouse.y = event.offsetY / unit - 1 / aspect;
		if (mouse.left) {
			camera = mat3.multiply(mat3.translate(event.movementX / unit, event.movementY / unit), camera);
			draw();
		}
		if (mouse.right) {
			const position = mat3.multiplyVector(camera, new vec3(mouse.x, mouse.y, 1));
			slope = position.y / position.x;
			draw();
		}
	});

	canvas.addEventListener("mousedown", event => {
		if (event.button == 0)
			mouse.left = true;
		else if (event.button == 2)
			mouse.right = true;
	});

	canvas.addEventListener("mouseup", event => {
		if (event.button == 0)
			mouse.left = false;
		else if (event.button == 2)
			mouse.right = false;
	});
});
