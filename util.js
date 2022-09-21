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
	constructor(...values) {
		this.values = [...values];
	}

	get x() {
		return this.values[0];
	}

	get y() {
		return this.values[1];
	}

	get z() {
		return this.values[2];
	}

	set x(value) {
		this.values[0] = value;
	}

	set y(value) {
		this.values[1] = value;
	}

	set z(value) {
		this.values[2] = value;
	}

	copy() {
		return new vec3(...this.values);
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

	scale(...values) {
		return new vec3(...values.map((x, i) => x * this.values[i]));
	}

	static add(a, b) {
		return new vec3(...a.values.map((x, i) => x + b.values[i]));
	}

	static subtract(a, b) {
		return vec3.add(a, vec3.multiply(b, -1));
	}

	static multiply(vector, scalar) {
		return new vec3(...vector.values.map(x => x * scalar));
	}

	static divide(vector, scalar) {
		return vec3.multiply(vector, 1 / scalar);
	}

	static dot(a, b) {
		return a.values.reduce((sum, x, i) => sum + x * b.values[i], 0);
	}

	debug() {
		console.log("vec3: " + this.values);
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

	debug() {
		console.log("vec3aug:");
		this.a.debug();
		this.b.debug();
	}
}

class mat3 {
	// x, y, and z are vec3s
	constructor(...values) {
		this.values = [...values.map(value => value.copy())];
	}

	get x() {
		return this.values[0];
	}

	get y() {
		return this.values[1];
	}

	get z() {
		return this.values[2];
	}

	set x(value) {
		this.values[0] = value;
	}

	set y(value) {
		this.values[1] = value;
	}

	set z(value) {
		this.values[2] = value;
	}

	copy() {
		return new mat3(...this.values);
	}

	transpose() {
		return new mat3(...this.values[0].values.map((x, i) => new vec3(...this.values.map((x, j) => this.values[j].values[i]))));
	}

	invert() {
		const m = new mat3aug(this, mat3.identity());

		// Swap rows until we have non-zero pivots.
		for (let i = 0; i < m.a.values.length; i++) {
			// If this pivot is zero, we gotta swap rows.
			if (m.a.values[i].values[i] == 0) {
				// Look through all the other rows for one to swap with.
				for(let j = 0; j < m.a.values.length; j++) {
					// Ignore the same row.
					if (i == j)
						continue;
					// If we found a different row that has a non-zero value in the column of the pivot we want to replace, then let's swap it.
					if (m.a.values[j].values[i] != 0) {
						m.swap(i, j);
						break;
					}
				}
				// If we did not find a non-zero replacement, this matrix cannot be inverted.
				if (m.a.values[i].values[i] == 0)
					return;
			}
		}

		// Set each value in column besides the pivot to zero by adding to rows by multiples of the row with the pivot.
		for (let i = 0; i < m.a.values.length; i++) {
			for (let j = 0; j < m.a.values.length; j++) {
				if (i == j)
					continue;
				m.set(j, vec3aug.add(m.get(j), vec3aug.multiply(m.get(i), -m.a.values[j].values[i] / m.a.values[i].values[i])));
			}
		}

		// Scale each row by the inverse of its pivot to bring pivot to 1.
		for (let i = 0; i < m.a.values.length; i++) {
			m.set(i, vec3aug.multiply(m.get(i), 1 / m.a.values[i].values[i]));
		}

		// Return the inverted identity part of the augmented matrix.
		return m.b.copy();
	}

	swap(i, j) {
		[this.values[i], this.values[j]] = [this.values[j], this.values[i]];
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

	static identity(n = 3) {
		return new mat3(...[...new Array(n).keys()].map(i => new vec3(...[...new Array(n).keys()].map(j => i == j ? 1 : 0))));
	}

	static translate(...values) {
		const n = values.length + 1;
		return new mat3(...[...new Array(n).keys()].map(i => new vec3(...[...new Array(n).keys()].map(j => i == j ? 1 : (j == n - 1 ? values[i] : 0)))));
	}

	static scale(...values) {
		const n = values.length + 1;
		return new mat3(...[...new Array(n).keys()].map(i => new vec3(...[...new Array(n).keys()].map(j => i == j ? (i == n - 1 ? 1 : values[i]) : 0))));
	}

	static rotate(angle, x = 0, y = 1, n = 3) {
		function get_value(i, j) {
			if (i == j && i == n - 1)
				return 1;
			if (i == x && j == x || i == y && j == y)
				return Math.cos(angle);
			if (i == x && j == y)
				return Math.sin(angle);
			if (i == y && j == x)
				return -Math.sin(angle);
			return 0;
		}
		return new mat3(...[...new Array(n).keys()].map(i => new vec3(...[...new Array(n).keys()].map(j => get_value(i, j)))));
	}

	static multiply(a, b) {
		const n = a.values.length;
		const c = b.transpose();
		return new mat3(...[...new Array(n).keys()].map(i => new vec3(...[...new Array(n).keys()].map(j => vec3.dot(a.values[i], c.values[j])))));
	}

	static multiplyVector(matrix, vector) {
		return new vec3(...[...new Array(vector.values.length).keys()].map(i => vec3.dot(matrix.values[i], vector)));
	}

	debug() {
		console.log("mat3:");
		for (const x of this.values) {
			x.debug();
		}
	}
}

class mat3aug {
	// a and b are mat3s
	constructor(a, b) {
		this.a = a.copy();
		this.b = b.copy();
	}

	swap(i, j) {
		this.a.swap(i, j);
		this.b.swap(i, j);
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

	get(i) {
		return new vec3aug(this.a.values[i], this.b.values[i]);
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

	set(i, vector) {
		this.a.values[i] = vector.a.copy();
		this.b.values[i] = vector.b.copy();
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

	debug() {
		console.log("mat3aug:");
		this.a.debug();
		this.b.debug();
	}
}
