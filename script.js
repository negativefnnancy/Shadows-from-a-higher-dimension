const gridThickness = 0.005;
const axisThickness = 0.02;
const lineThickness = 0.02;
const shadowThickness = 0.03;
const orthogonalLineThickness = 0.01;
const vectorThickness = 0.02;
const vectorProjectionThickness = 0.01;
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
const vectorProjectionStyle = "#f0f";
const scrollAmount = 1.1;

const gridMinX = -20;
const gridMinY = -20;
const gridMaxX =  20;
const gridMaxY =  20;

const epsilon = 0.000001;

const phi = (1 + Math.sqrt(5)) / 2;

let canvas;
let context;

let mouse = new Mouse(new vec3(0, 0, 0), new vec3(0, 0, 0), new vec3(0, 0, 0), new vec3(0, 0, 0), false, false, false);
let slope = 1 / phi;

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
			const shadowed = pl.y <= shadowMax && pl.y > shadowMin + epsilon;

			// Draw it.
			context.fillStyle = i == 0 || j == 0 ? axisStyle : (shadowed ? gridShadedStyle : gridStyle);
			context.beginPath();
			context.arc(position.x, position.y, i == 0 || j == 0 ? axisRadius : (shadowed ? gridShadedRadius : gridRadius), 0, 2 * Math.PI, false);
			context.fill();

			if (shadowed) {
				// Project onto plane.
				const plp = pl.scale(1, 0, 1);

				// Transform back to global coordinates.
				const pp = mat3.multiplyVector(localInverse, plp);

				// Draw vector.
				context.lineWidth = vectorProjectionThickness;
				context.strokeStyle = vectorProjectionStyle;
				drawVector(position, pp);
			}
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
	context.lineWidth = vectorThickness;
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
				camera = mat3.multiply(mat3.translate(mouse.movement.x, mouse.movement.y), camera);
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
