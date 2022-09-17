const gridThickness = 0.005;
const axisThickness = 0.02;
const lineThickness = 0.02;
const shadowThickness = 0.03;
const orthogonalLineThickness = 0.01;
const vectorThickness = 0.02;
const vectorHeadLength = 0.125;
const gridRadius = 0.02;
const gridShadedRadius = 0.04;
const axisRadius = 0.03;
const gridStyle = "black";
const gridShadedStyle = "#fe0";
const axisStyle = "red";
const lineStyle = "#0c0";
const shadowStyle = "#80f";
const sliceStyle = "#cde";

const orthogonalLineStyle = "#080";
const unitHyperCubeStyle = "blue";
const unitHyperCubeStyleOrigin = "#88f";
const unitHyperCubeStyleOriginLocal = "#8cf";
const vectorStyle = "#f80";
const scrollAmount = 1.1;

const gridMinX = -20;
const gridMinY = -20;
const gridMaxX =  20;
const gridMaxY =  20;

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

	angle() {
		return Math.atan2(this.y, this.x);
	}

	scale(x, y, z) {
		return new vec3(this.x * x, this.y * y, this.z * z);
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
let slope = 1 / 2;

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

function drawVector(a, b) {
	const angle = vec3.subtract(b, a).angle();
	const angleHead1 = angle + Math.PI * 0.75;
	const angleHead2 = angle - Math.PI * 0.75;
	const headOffset1 = new vec3(Math.cos(angleHead1) * vectorHeadLength, Math.sin(angleHead1) * vectorHeadLength, 1);
	const headOffset2 = new vec3(Math.cos(angleHead2) * vectorHeadLength, Math.sin(angleHead2) * vectorHeadLength, 1);
	const h1 = vec3.add(b, headOffset1);
	const h2 = vec3.add(b, headOffset2);
	context.lineWidth = vectorThickness;
	context.beginPath();
	context.moveTo(a.x, a.y);
	context.lineTo(b.x, b.y);
	context.stroke();
	context.moveTo(h1.x, h1.y);
	context.lineTo(b.x, b.y);
	context.lineTo(h2.x, h2.y);
	context.stroke();
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

	// Original vertices of unit square.
	const p1o = new vec3(0, 0, 1);
	const p2o = new vec3(1, 0, 1);
	const p3o = new vec3(0, 1, 1);
	const p4o = new vec3(1, 1, 1);

	// Translated vertices.
	const p1 = vec3.add(unitHyperCubePosition, p1o);
	const p2 = vec3.add(unitHyperCubePosition, p2o);
	const p3 = vec3.add(unitHyperCubePosition, p3o);
	const p4 = vec3.add(unitHyperCubePosition, p4o);
	p1.z = 1;
	p2.z = 1;
	p3.z = 1;
	p4.z = 1;

	// Get local coordinate system of rotated line and the inverse for later.
	const local = mat3.rotate(Math.atan(slope));
	const localInverse = local.invert();

	// Transform vertices to local coordinates of line.
	const p1ol = mat3.multiplyVector(local, p1);
	const p2ol = mat3.multiplyVector(local, p2);
	const p3ol = mat3.multiplyVector(local, p3);
	const p4ol = mat3.multiplyVector(local, p4);

	// Orthogonally project by discarding coordinates.
	const p1olp = p1ol.scale(0, 1, 1);
	const p2olp = p2ol.scale(0, 1, 1);
	const p3olp = p3ol.scale(0, 1, 1);
	const p4olp = p4ol.scale(0, 1, 1);

	// Transform back to global coordinates.
	const p1op = mat3.multiplyVector(localInverse, p1olp);
	const p2op = mat3.multiplyVector(localInverse, p2olp);
	const p3op = mat3.multiplyVector(localInverse, p3olp);
	const p4op = mat3.multiplyVector(localInverse, p4olp);

	// Get shadow range and endpoints.
	const shadowMin = Math.min(p1olp.y, p2olp.y, p3olp.y, p4olp.y);
	const shadowMax = Math.max(p1olp.y, p2olp.y, p3olp.y, p4olp.y);
	const shadowLocal1 = new vec3(0, shadowMin, 1);
	const shadowLocal2 = new vec3(0, shadowMax, 1);

	// Transform shadow endpoints back to global coordinates.
	const w1 = mat3.multiplyVector(localInverse, shadowLocal1);
	const w2 = mat3.multiplyVector(localInverse, shadowLocal2);

	// Draw slice region
	const wa = new vec3(gridMinX, (gridMinX - w1.x) * slope + w1.y, 1);
	const wb = new vec3(gridMaxX, (gridMaxX - w1.x) * slope + w1.y, 1);
	const wc = new vec3(gridMinX, (gridMinX - w2.x) * slope + w2.y, 1);
	const wd = new vec3(gridMaxX, (gridMaxX - w2.x) * slope + w2.y, 1);
	context.fillStyle = sliceStyle;
	context.beginPath();
	context.moveTo(wa.x, wa.y);
	context.lineTo(wb.x, wb.y);
	context.lineTo(wd.x, wd.y);
	context.lineTo(wc.x, wc.y);
	context.fill();

	// Unit square moveable with middle mouse button.
	context.fillStyle = unitHyperCubeStyle;
	context.fillRect(unitHyperCubePosition.x, unitHyperCubePosition.y, 1, 1);

	// Draw grid.
	for (let i = gridMinX; i <= gridMaxX; i++) {
		context.lineWidth = i == 0 ? axisThickness : gridThickness;
		context.strokeStyle = i == 0 ? axisStyle : gridStyle;
		const a = new vec3(i, gridMinY, 1);
		const b = new vec3(i, gridMaxY, 1);
		context.beginPath();
		context.moveTo(a.x, a.y);
		context.lineTo(b.x, b.y);
		context.stroke();
	}
	for (let i = gridMinY; i <= gridMaxY; i++) {
		context.lineWidth = i == 0 ? axisThickness : gridThickness;
		context.strokeStyle = i == 0 ? axisStyle : gridStyle;
		const a = new vec3(gridMinX, i, 1);
		const b = new vec3(gridMaxX, i, 1);
		context.beginPath();
		context.moveTo(a.x, a.y);
		context.lineTo(b.x, b.y);
		context.stroke();
	}

	// Draw lattice nodes.
	for (let i = gridMinX; i <= gridMaxX; i++)
		for (let j = gridMinY; j <= gridMaxY; j++) {
			// Global coordinates of the node.
			const position = new vec3(i, j, 1);

			// Now get coordinates local to the projected line.
			const pl = mat3.multiplyVector(local, position);

			// Now determine if its in the shadowed region.
			const shadowed = pl.y <= shadowMax && pl.y > shadowMin;

			// Draw it.
			context.fillStyle = i == 0 || j == 0 ? axisStyle : (shadowed ? gridShadedStyle : gridStyle);
			context.beginPath();
			context.arc(position.x, position.y, i == 0 || j == 0 ? axisRadius : (shadowed ? gridShadedRadius : gridRadius), 0, 2 * Math.PI, false);
			context.fill();
		}

	// Draw projection plane.
	const a = new vec3(gridMinX, gridMinX * slope, 1);
	const b = new vec3(gridMaxX, gridMaxX * slope, 1);
	context.lineWidth = lineThickness;
	context.strokeStyle = lineStyle;
	context.beginPath();
	context.moveTo(a.x, a.y);
	context.lineTo(b.x, b.y);
	context.stroke();

	// Draw the orthogonal line as well.
	const a2 = new vec3(gridMaxX * slope, gridMinX, 1);
	const b2 = new vec3(gridMinX * slope, gridMaxX, 1);
	context.lineWidth = orthogonalLineThickness;
	context.strokeStyle = orthogonalLineStyle;
	context.beginPath();
	context.moveTo(a2.x, a2.y);
	context.lineTo(b2.x, b2.y);
	context.stroke();

	// Draw projection of unit square onto line.
	context.strokeStyle = vectorStyle;
	drawVector(p1op, p1);
	drawVector(p2op, p2);
	drawVector(p3op, p3);
	drawVector(p4op, p4);

	// Draw full shadow line segment.
	context.lineWidth = shadowThickness;
	context.strokeStyle = shadowStyle;
	context.beginPath();
	context.moveTo(w1.x, w1.y);
	context.lineTo(w2.x, w2.y);
	context.stroke();

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
			unitHyperCubePosition = vec3.add(mouse.movementWorld, unitHyperCubePosition);
			draw();
		}
		if (mouse.middle) {
			if (event.shiftKey) {
				const position = mouse.position;
				position.z = 0;
				const direction = position.unit();
				const radius = position.distance();
				const amount = direction.x * mouse.movement.y - direction.y * mouse.movement.x;
				camera = mat3.multiply(mat3.rotate(-amount / radius), camera);
			} else {
				camera = mat3.multiply(mat3.translate(mouse.movement.x, mouse.movement.y, 0), camera);
			}
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
