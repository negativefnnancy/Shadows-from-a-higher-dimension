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

			// Draw it.
			context.fillStyle = i == 0 || j == 0 ? axisStyle : gridStyle;
			context.beginPath();
			context.arc(position.x, position.y, i == 0 || j == 0 ? axisRadius : gridRadius, 0, 2 * Math.PI, false);
			context.fill();
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
			if (event.shiftKey) {
				// Rotate camera.
				const position = mouse.position;
				position.z = 0;
				const direction = position.unit();
				const radius = position.distance();
				const amount = direction.x * mouse.movement.y - direction.y * mouse.movement.x;
				camera = mat3.multiply(mat3.rotate(-amount / radius), camera);
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
