const gridThickness = 0.01;
const axisThickness = 0.02;
const lineThickness = 0.02;
const gridRadius = 0.02;
const axisRadius = 0.03;
const gridStyle = "black";
const axisStyle = "red";
const lineStyle = "green";
const unitHyperCubeStyle = "blue";
const scrollAmount = 1.1;

let canvas;
let context;

class Mouse {
	constructor(position, positionWorld, movement, movementWorld, left, middle, right) {
		this.position = position; // Normalized device coordinates on screen position.
		this.positionWorld = positionWorld; // World coordinates.
		this.movement = movement;
		this.movementWorld = movementWorld;
		this.left = left;
		this.middle = middle;
		this.right = right;
	}
}

class vec3 {
	// x, y, and z are numbers
	constructor(x, y, z) {
		this.x = x;
		this.y = y;
		this.z = z;
	}

	copy() {
		return new vec3(this.x, this.y, this.z);
	}

	distance() {
		return Math.sqrt(vec3.dot(this, this));
	}

	unit() {
		return vec3.divide(this, this.distance());
	}

	static add(a, b) {
		return new vec3(a.x + b.x, a.y + b.y, a.z + b.z);
	}

	static subtract(a, b) {
		return vec3.add(a, vec3.multiply(b, -1));
	}

	static multiply(vector, scalar) {
		return new vec3(vector.x * scalar, vector.y * scalar, vector.z * scalar);
	}

	static divide(vector, scalar) {
		return vec3.multiply(vector, 1 / scalar);
	}

	static dot(a, b) {
		return a.x * b.x + a.y * b.y + a.z * b.z;
	}
}

// A vector augmented with another vector.
class vec3aug {
	// a and b are vec3s
	constructor(a, b) {
		this.a = a.copy();
		this.b = b.copy();
	}

	static add(a, b) {
		return new vec3aug(vec3.add(a.a, b.a), vec3.add(a.b, b.b));
	}

	static multiply(vector, scalar) {
		return new vec3aug(vec3.multiply(vector.a, scalar), vec3.multiply(vector.b, scalar));
	}

	static dot(a, b) {
		return vec3.dot(a.a, b.a) + vec3.dot(a.b, b.b);
	}
}

class mat3 {
	// x, y, and z are vec3s
	constructor(x, y, z) {
		this.x = x.copy();
		this.y = y.copy();
		this.z = z.copy();
	}

	copy() {
		return new mat3(this.x, this.y, this.z);
	}

	transpose() {
		return new mat3(new vec3(this.x.x, this.y.x, this.z.x), new vec3(this.x.y, this.y.y, this.z.y), new vec3(this.x.z, this.y.z, this.z.z));
	}

	invert() {
		const m = new mat3aug(this, mat3.identity());

		// Swap rows for non-zero pivots.
		if (m.a.x.x == 0) {
			if (m.a.y.x != 0) {
				m.swapXY();
			} else if (m.z.x != 0) {
				m.swapXZ();
			} else {
				return;
			}
		}
		if (m.a.y.y == 0) {
			if (m.a.z.y != 0) {
				m.swapYZ();
			} else {
				return;
			}
		}
		if (m.a.z.z == 0) {
			return;
		}

		// Set each value in column besides the pivot to zero by adding to rows by multiples of the row with the pivot.
		m.y = vec3aug.add(m.y, vec3aug.multiply(m.x, -m.a.y.x / m.a.x.x));
		m.z = vec3aug.add(m.z, vec3aug.multiply(m.x, -m.a.z.x / m.a.x.x));
		m.x = vec3aug.add(m.x, vec3aug.multiply(m.y, -m.a.x.y / m.a.y.y));
		m.z = vec3aug.add(m.z, vec3aug.multiply(m.y, -m.a.z.y / m.a.y.y));
		m.x = vec3aug.add(m.x, vec3aug.multiply(m.z, -m.a.x.z / m.a.z.z));
		m.y = vec3aug.add(m.y, vec3aug.multiply(m.z, -m.a.y.z / m.a.z.z));

		// Scale each row by the inverse of its pivot to bring pivot to 1.
		m.x = vec3aug.multiply(m.x, 1 / m.a.x.x);
		m.y = vec3aug.multiply(m.y, 1 / m.a.y.y);
		m.z = vec3aug.multiply(m.z, 1 / m.a.z.z);

		// Return the inverted identity part of the augmented matrix.
		return m.b.copy();
	}

	swapXY() {
		[this.x, this.y] = [this.y, this.x];
	}

	swapXZ() {
		[this.x, this.z] = [this.z, this.x];
	}

	swapYZ() {
		[this.y, this.z] = [this.z, this.y];
	}

	static identity() {
		return new mat3(new vec3(1, 0, 0), new vec3(0, 1, 0), new vec3(0, 0, 1));
	}

	static translate(x, y) {
		return new mat3(new vec3(1, 0, x), new vec3(0, 1, y), new vec3(0, 0, 1));
	}

	static scale(x, y) {
		return new mat3(new vec3(x, 0, 0), new vec3(0, y, 0), new vec3(0, 0, 1));
	}

	static rotate(angle) {
		return new mat3(new vec3(Math.cos(angle), Math.sin(angle), 0), new vec3(-Math.sin(angle), Math.cos(angle), 0), new vec3(0, 0, 1));
	}

	static multiply(a, b) {
		const c = b.transpose();
		return new mat3(new vec3(vec3.dot(a.x, c.x), vec3.dot(a.x, c.y), vec3.dot(a.x, c.z)),
		                new vec3(vec3.dot(a.y, c.x), vec3.dot(a.y, c.y), vec3.dot(a.y, c.z)),
		                new vec3(vec3.dot(a.z, c.x), vec3.dot(a.z, c.y), vec3.dot(a.z, c.z)));
	}

	static multiplyVector(matrix, vector) {
		return new vec3(vec3.dot(matrix.x, vector), vec3.dot(matrix.y, vector), vec3.dot(matrix.z, vector));
	}
}

class mat3aug {
	// a and b are mat3s
	constructor(a, b) {
		this.a = a.copy();
		this.b = b.copy();
	}

	swapXY() {
		this.a.swapXY();
		this.b.swapXY();
	}

	swapXZ() {
		this.a.swapXZ();
		this.b.swapXZ();
	}

	swapYZ() {
		this.a.swapYZ();
		this.b.swapYZ();
	}

	get x() {
		return new vec3aug(this.a.x, this.b.x);
	}

	get y() {
		return new vec3aug(this.a.y, this.b.y);
	}

	get z() {
		return new vec3aug(this.a.z, this.b.z);
	}

	set x(vector) {
		this.a.x = vector.a.copy();
		this.b.x = vector.b.copy();
	}

	set y(vector) {
		this.a.y = vector.a.copy();
		this.b.y = vector.b.copy();
	}

	set z(vector) {
		this.a.z = vector.a.copy();
		this.b.z = vector.b.copy();
	}
}

let mouse = new Mouse(new vec3(0, 0, 0), new vec3(0, 0, 0), new vec3(0, 0, 0), new vec3(0, 0, 0), false, false, false);
let slope = 1/2;

let camera = mat3.identity();
let unitHyperCubePosition = new vec3(0, 0, 1);

function getScreenTransform() {
	const unit = canvas.width / 2;
	const aspect = canvas.height / canvas.width;
	return mat3.multiply(mat3.multiply(mat3.scale(unit, unit), mat3.translate(1, aspect)), mat3.scale(1, -1));
}

function getTransform() {
	return mat3.multiply(getScreenTransform(), camera);
}

function draw() {

	// Clear screen.
	context.resetTransform();
	context.clearRect(0, 0, canvas.width, canvas.height);

	// Setup normalized device coordinates.
	const transform = getTransform();
	context.setTransform(transform.x.x, transform.y.x,
		             transform.x.y, transform.y.y,
		             transform.x.z, transform.y.z);


	// Unit square moveable with middle mouse button.
	context.fillStyle = unitHyperCubeStyle;
	context.fillRect(unitHyperCubePosition.x, unitHyperCubePosition.y, 1, 1);

	// Draw grid.
	for (let i = -10; i <= 10; i++) {
		context.lineWidth = i == 0 ? axisThickness : gridThickness;
		context.strokeStyle = i == 0 ? axisStyle : gridStyle;
		const a = new vec3(i, -10, 1);
		const b = new vec3(i,  10, 1);
		context.beginPath();
		context.moveTo(a.x, a.y);
		context.lineTo(b.x, b.y);
		context.stroke();
	}
	for (let i = -10; i <= 10; i++) {
		context.lineWidth = i == 0 ? axisThickness : gridThickness;
		context.strokeStyle = i == 0 ? axisStyle : gridStyle;
		const a = new vec3(-10, i, 1);
		const b = new vec3( 10, i, 1);
		context.beginPath();
		context.moveTo(a.x, a.y);
		context.lineTo(b.x, b.y);
		context.stroke();
	}

	// Draw lattice nodes.
	for (let i = -10; i <= 10; i++)
		for (let j = -10; j <= 10; j++) {
			context.fillStyle = i == 0 || j == 0 ? axisStyle : gridStyle;
			const position = new vec3(i, j, 1);
			context.beginPath();
			context.arc(position.x, position.y, i == 0 || j == 0 ? axisRadius : gridRadius, 0, 2 * Math.PI, false);
			context.fill();
		}

	// Draw projection plane.
	const a = new vec3(-10, -10 * slope, 1);
	const b = new vec3( 10,  10 * slope, 1);
	context.lineWidth = lineThickness;
	context.strokeStyle = lineStyle;
	context.beginPath();
	context.moveTo(a.x, a.y);
	context.lineTo(b.x, b.y);
	context.stroke();

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
		const screen = getScreenTransform();
		const position = mat3.multiplyVector(screen.invert(), new vec3(event.pageX, event.pageY, 1));
		const positionWorld = mat3.multiplyVector(camera.invert(), position);
		mouse.movement = vec3.subtract(position, mouse.position);
		mouse.movementWorld = vec3.subtract(positionWorld, mouse.positionWorld);
		mouse.position = position;
		mouse.positionWorld = positionWorld;
		if (mouse.left) {
			if (event.shiftKey) {
				const position = mouse.position;
				position.z = 0;
				const direction = position.unit();
				const radius = position.distance();
				const amount = direction.x * mouse.movement.y - direction.y * mouse.movement.x;
				console.log(direction, radius, amount);
				camera = mat3.multiply(mat3.rotate(-amount / radius), camera);
			} else {
				camera = mat3.multiply(mat3.translate(mouse.movement.x, mouse.movement.y, 0), camera);
			}
			draw();
		}
		if (mouse.middle) {
			unitHyperCubePosition = vec3.add(mouse.movementWorld, unitHyperCubePosition);
			draw();
		}
		if (mouse.right) {
			slope = mouse.positionWorld.y / mouse.positionWorld.x;
			draw();
		}
	});

	canvas.addEventListener("mousedown", event => {
		if (event.button == 0)
			mouse.left = true;
		else if (event.button == 1)
			mouse.middle = true;
		else if (event.button == 2)
			mouse.right = true;
	});

	canvas.addEventListener("mouseup", event => {
		if (event.button == 0)
			mouse.left = false;
		else if (event.button == 1)
			mouse.middle = false;
		else if (event.button == 2)
			mouse.right = false;
	});
});
