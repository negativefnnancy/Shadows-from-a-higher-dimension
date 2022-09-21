const gridThickness = 0.01;
const axisThickness = 0.04;
const gridRadius = 0.04;
const axisRadius = 0.06;
const gridStyle = "black";
const axisStyle = "red";

const scrollAmount = 1.1;
const rotationAmount = 1;

const gridMin = -3;
const gridMax =  3;

const epsilon = 0.000001;

const phi = (1 + Math.sqrt(5)) / 2;

const dimensions = 4;

let canvas;
let context;

let mouse = new Mouse(vec3.empty(3), vec3.empty(3), vec3.empty(3), false, false, false);
let camera = mat3.identity();
let rotation = mat3.identity(dimensions + 1);
let unitHyperCubePosition = new vec3(...[...new Array(dimensions + 1).keys()].map(i => i == dimensions ? 1 : 0));

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

function *combinations(n, min, max) {
	if (n == 0)
		yield [];
	else
		for (let i = min; i <= max; i++)
			for (let rest of combinations(n - 1, min, max))
				yield [i].concat(rest);
}

function cubeVertices(n) {
	return [...combinations(n, 0, 1)].map(x => new vec3(...x));
}

const vertices = cubeVertices(dimensions);

function draw() {

	// Clear screen.
	context.resetTransform();
	context.clearRect(0, 0, canvas.width, canvas.height);

	// Setup normalized device coordinates.
	const transform = getTransform();
	context.setTransform(transform.x.x, transform.y.x,
		             transform.x.y, transform.y.y,
		             transform.x.z, transform.y.z);

	// Get the unit hyper cube vertices in transformed coordinates.
	const cubeTransform = mat3.multiply(mat3.translate(...unitHyperCubePosition.values.slice(0, unitHyperCubePosition.values.length - 1)), rotation);
	const verticesLocal = vertices.map(x => mat3.multiplyVector(cubeTransform, new vec3(...x.values.concat([1]))));

	// Find the min and max on each axis starting with dimension 3.
	const cubeMin = [...new Array(dimensions).keys()].slice(2).map(i => Math.min(...verticesLocal.map(x => x.values[i])));
	const cubeMax = [...new Array(dimensions).keys()].slice(2).map(i => Math.max(...verticesLocal.map(x => x.values[i])));

	// Draw grid.
	for (let i = 0; i < dimensions; i++) {
		for (line_index of combinations(dimensions - 1, gridMin, gridMax)) {
			const axis = line_index.reduce((a, b) => a && b == 0, true);
			context.lineWidth = axis ? axisThickness : gridThickness;
			context.strokeStyle = axis ? axisStyle : gridStyle;
			context.fillStyle = axis ? axisStyle : gridStyle;
			// Draw lattice nodes.
			for (let x = gridMin; x < gridMax; x++) {
				const a = new vec3(...line_index.slice(0, i).concat([x]).concat(line_index.slice(i)).concat([1]));
				const b = new vec3(...line_index.slice(0, i).concat([x + 1]).concat(line_index.slice(i)).concat([1]));
				const al = mat3.multiplyVector(rotation, a);
				const bl = mat3.multiplyVector(rotation, b);
				// Make sure we are in the slice of the unit hyper cube for the xy plane.
				const a0 = al.values.slice(2, dimensions).reduce((a, b, i) => a && b >= cubeMin[i] && b < cubeMax[i], true);
				const b0 = bl.values.slice(2, dimensions).reduce((a, b, i) => a && b >= cubeMin[i] && b < cubeMax[i], true);
				let [ar, ag, ab] = al.values.slice(2, 5).map((x, i) => x - cubeMin[i]);
				if (isNaN(ar))
					ar = 0;
				if (isNaN(ag))
					ag = 0;
				if (isNaN(ab))
					ab = 0;
				//const [br, bg, bb] = bl.values.slice(2, 5).map((x, i) => x - cubeMin[i]);
				context.strokeStyle = context.fillStyle = `rgb(${ar * 255}, ${ag * 255}, ${ab * 255})`;
				if (a0 && b0) {
					context.beginPath();
					context.moveTo(al.x, al.y);
					context.lineTo(bl.x, bl.y);
					context.stroke();
				}
				if (a0) {
					context.beginPath();
					context.arc(al.x, al.y, axis ? axisRadius : gridRadius, 0, 2 * Math.PI, false);
					context.fill();
				}
				//if (b0) {
				//	context.beginPath();
				//	context.arc(bl.x, bl.y, axis ? axisRadius : gridRadius, 0, 2 * Math.PI, false);
				//	context.fill();
				//}
			}
		}
	}
}

window.addEventListener("load", event => {
	canvas = document.getElementById("canvas");
	context = canvas.getContext("2d");
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	draw();

	canvas.addEventListener("contextmenu", event => event.preventDefault());

	canvas.addEventListener("wheel", event => {
		// Zoom camera.
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
		if (mouse.left || mouse.right || mouse.middle) {
			if (event.shiftKey || event.ctrlKey) {
				let i;
				if (event.shiftKey && !event.ctrlKey)
					i = 2;
				else if (!event.shiftKey && event.ctrlKey)
					i = 3;
				else if (event.shiftKey && event.ctrlKey)
					i = 4;
				// Rotate camera.
				const amountX = mouse.movement.x * rotationAmount;
				const amountY = mouse.movement.y * rotationAmount;
				rotation = mat3.multiply(mat3.rotate(amountX, 0, i, dimensions + 1), rotation);
				rotation = mat3.multiply(mat3.rotate(amountY, 1, i, dimensions + 1), rotation);
			} else {
				// Pan camera.
				camera = mat3.multiply(mat3.translate(mouse.movement.x, mouse.movement.y), camera);
			}
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
