/*
    Matrix implementation
*/
function Matrix(m, n, data) {
    this.m = m;
    this.n = n;
    this.size = m * n;
    this.data = data && data.length == this.size ? data : new Float64Array(this.size);
    this.is_matrix = true;
}
Matrix.prototype.setRow = function (index, data) {
    if (!data || !('length' in data) || data.length != this.n)
        return null;    
    this.data.set(data, index * this.n);
    return this;
};
Matrix.prototype.consoleOut = function () {
    console.log(this.m + " x " + this.n);
    for (var i = 0; i < this.m; i++) {
        var str = "";
        for (var j = 0; j < this.n; j++)
            str += this.data[i * this.n + j] + ',';
        console.log(str.substr(0, Math.max(0, str.length - 1)));
    }
};
Matrix.prototype.setIdentity = function () {
    this.data.fill(0);
    for (var i = 0; i < this.size; i += this.n + 1)
        this.data[i] = 1;
};
Matrix.prototype.randomFill = function () {
    const r = new Int8Array(this.size);
    crypto.getRandomValues(r);
    for (var i = 0; i < this.size; i++)
        this.data[i] = r[i];

};
Matrix.prototype.get = function (i, j) {
    const ij = i * this.n + j;
    return ij >= this.size ? null : this.data[ij];
};

Matrix.prototype.add = function (scalar, in_place) {
    if (!in_place) {
        const s = new Matrix(this.m, this.n);
        for (let i = 0; i < this.size; i++)
            s.data[i] = this.data[i] + scalar
        return s;
    }
    for (var i = 0; i < this.size; i++)
        this.data[i] += scalar;
    return this;
};
Matrix.prototype.sub = function (scalar, in_place) {
    if (!in_place) {
        const s = new Matrix(this.m, this.n);
        for (let i = 0; i < this.size; i++)
            s.data[i] = this.data[i] - scalar
        return s;
    }
    for (var i = 0; i < this.size; i++)
        this.data[i] -= scalar;
    return this;
};
Matrix.prototype.mul = function (scalar, in_place) {
    if (!in_place) {
        const s = new Matrix(this.m, this.n);
        for (let i = 0; i < this.size; i++)
            s.data[i] = this.data[i] * scalar
        return s;
    }
    for (var i = 0; i < this.size; i++)
        this.data[i] *= scalar;
    return this;
};
Matrix.prototype.div = function (scalar, in_place) {
    if (!in_place) {
        const s = new Matrix(this.m, this.n);
        for (let i = 0; i < this.size; i++)
            s.data[i] = this.data[i] / scalar
        return s;
    }
    for (var i = 0; i < this.size; i++)
        this.data[i] /= scalar;
    return this;
};

Matrix.prototype.transpose = function (in_place) {
    const trans = new Matrix(this.n, this.m);
    for (var i = 0; i < this.m; i++) {
        for (var j = 0; j < this.n; j++) {
            trans.data[j * this.m + i] = this.data[i * this.n + j];
        }
    }

    if (in_place) {
        this.data.set(trans.data);
        return this;
    }
    return trans;
}

Matrix.prototype.rowAdd = function (sourceRow, destinationRow, multiplier, startColumn, endColumn) {
    const iR = this.n * sourceRow;
    const jR = this.n * destinationRow;
    for (var c = startColumn; c < endColumn; c++)
        this.data[jR + c] += this.data[iR + c] * multiplier;
};
Matrix.prototype.rowSwap = function (a, b) {
    const r2 = Float64Array.from(this.data.subarray(this.n * b, this.n * (b + 1)));
    this.data.copyWithin(this.n * b, this.n * a, this.n * (a + 1));
    this.data.set(r2, this.n * a);
};
Matrix.prototype.rowMul = function (row, multiplier, startColumn, endColumn) {
    const iR = row * this.n;
    for (var c = startColumn; c < endColumn; c++) {
        this.data[iR + c] *= multiplier;
    }
};

Matrix.prototype.colSwap = function(a,b){    
    for (;a < this.size; a += this.n, b += this.n)
    {
        const tmp = this.data[a];
        this.data[a] = this.data[b];
        this.data[b] = tmp;
    }
};

Matrix.prototype.addMatrix = function (b, in_place) {
    if ((this.m != b.m) | (this.n != b.n))
        return null;

    if (!in_place) {
        const sum = new Matrix(this.m, this.n);
        for (var i = 0; i < this.size; i++)
            sum.data[i] = this.data[i] + b.data[i];
        return sum;
    }
    for (var i = 0; i < this.size; i++)
        this.data[i] += b.data[i];
    return this;
};
Matrix.prototype.subMatrix = function (b, in_place) {
    if ((this.m != b.m) | (this.n != b.n))
        return null;

    if (!in_place) {
        const s = new Matrix(this.m, this.n);
        for (let i = 0; i < this.size; i++)
            s.data[i] = this.data[i] - b.data[i];
        return s;
    }
    for (var i = 0; i < this.size; i++)
        this.data[i] -= b.data[i];
    return this;
};
Matrix.prototype.mulMatrix = function (b, in_place) {
    if ((this.m != b.m) | (this.n != b.n))
        return null;

    if (!in_place) {
        const sum = new Matrix(this.m, this.n);
        for (var i = 0; i < this.size; i++)
            sum.data[i] = this.data[i] * b.data[i];
        return sum;
    }
    for (var i = 0; i < this.size; i++)
        this.data[i] *= b.data[i];
    return this;
};
Matrix.prototype.divMatrix = function (b, in_place) {
    if ((this.m != b.m) | (this.n != b.n))
        return null;

    if (!in_place) {
        const sum = new Matrix(this.m, this.n);
        for (var i = 0; i < this.size; i++)
            sum.data[i] = this.data[i] / b.data[i];
        return sum;
    }
    for (var i = 0; i < this.size; i++)
        this.data[i] /= b.data[i];
    return this;
};
Matrix.prototype.dotProduct = function (b, in_place) // in place only works for square matrixes (and can not square self)
{
    if (this.n != b.m)
        return null;
    if (!in_place) {
        const out = new Matrix(this.m, b.n);
        let it = 0;
        for (let i = 0; i < out.m; ++i) {
            for (let j = 0; j < out.n; ++j) {
                out.data[it] = 0;
                for (let k = 0; k < this.n; ++k)
                    out.data[it] += this.data[k + this.n * i] * b.data[j + k * b.n];
                ++it;
            }
        }        
        return out;
    }
    if (this.n != b.n || this.m != this.n || b == this)
        return null;
    const rowCopy = Float64Array.from(this.data.subarray(0, this.n));
    for (var i = 0; i < this.size;) {
        this.data[i] = 0;
        for (var j = 0; j < this.n; j++) {
            this.data[i] += rowCopy[j] * b.data[j * b.n + i % b.n];
        }
        if (++i % this.n == 0) {
            rowCopy.set(this.data.subarray(i, i + this.n));
        }
    }
    return this;
};

/*
    LU Decomposition
*/
function LUMatrix(matrix, in_place) {
    if (!('is_matrix' in matrix) || !matrix.is_matrix || matrix.m != matrix.n)
        Matrix.call(this, 0, 0);
    else
        Matrix.call(this, matrix.n, matrix.n, in_place ? matrix.data : Float64Array.from(matrix.data));

    this.is_lu_matrix = true;
    if ('is_lu_matrix' in matrix && matrix.is_lu_matrix) {
        this.inverted = matrix.inverted;
        this.p = in_place ? matrix.p : Uint16Array.from(matrix.p);
    }
    else {
        this.inverted = false;
        this.p = new Uint16Array(this.n + 1);
        this.p[this.n] = this.n;
        for (let i = 0; i < this.n; ++i)
            this.p[i] = i;

        for (let j = 0; j < this.n; ++j) {
            // pivot
            let max = 0;
            let row_argmax = j;
            for (let i = j; i < this.n; ++i) {
                const abs_element = Math.abs(this.data[j + this.n * i]);
                if (abs_element > max) {
                    max = abs_element;
                    row_argmax = i;
                }
            }
            
            if (j != row_argmax) {
                Matrix.prototype.rowSwap.call(this, j, row_argmax);
                const tmp = this.p[j];
                this.p[j] = this.p[row_argmax];
                this.p[row_argmax] = tmp;
                ++this.p[this.n];
            }
            // decompose
            for (let i = j + 1; i < this.n; ++i) {
                const ind = j + i * this.n;
                this.data[ind] /= this.data[j * (1 + this.n)];
                for (let k = j + 1; k < this.n; ++k)
                    this.data[k + i * this.n] -= this.data[ind] * this.data[k + this.n * j];
            }
        }
    }
}

LUMatrix.prototype.pivot = function (matrix, reverse, pivot_on_columns, in_place) {
    if (!('is_matrix' in matrix) || !matrix.is_matrix || matrix.m != this.n)
        return null;

    const P = reverse ? new Uint16Array(this.n) : this.p;
    if (reverse) {
        for (let k = 0; k < this.n; ++k)
            P[this.p[k]] = k;
    }

    const new_order = new Uint16Array(this.n);
    for (let k = 0; k < this.n; ++k)
        new_order[k] = k;

    const mat = in_place ? matrix : new Matrix(matrix.m, matrix.n, Float64Array.from(matrix.data));
    const swapFunction = pivot_on_columns ? Matrix.prototype.colSwap : Matrix.prototype.rowSwap;
    for (let i = 0; i < (this.n - 1); ++i) {
        const p = P[i];
        if (new_order[i] != p) {
            const r = new_order.indexOf(p, i + 1);
            swapFunction.call(mat, r, i);
            const tmp = new_order[i];
            new_order[i] = new_order[r];
            new_order[r] = tmp;
        }
    }
    return mat;
};

LUMatrix.prototype.compose = function () {
    const mat = new Matrix(this.n, this.n);
    let it = 0;
    if (this.inverted) {
        for (let i = 0; i < this.n; ++i) {
            for (let j = 0; j < this.n; ++j) {
                mat.data[it] = this.data[it] * (i <= j);
                for (let k = Math.max(i, j + 1); k < this.n; ++k)
                    mat.data[it] += this.data[k + this.n * i] * this.data[j + this.n * k];
                ++it;
            }
        }
        return this.pivot(mat, false, true, true);
    }
    for (let i = 0; i < this.n; ++i) {
        for (let j = 0; j < this.n; ++j) {            
            mat.data[it] = this.data[it] * (i <= j);
            const k_end = Math.min(i, j + 1);
            for (let k = 0; k < k_end; ++k)
                mat.data[it] += this.data[k + this.n * i] * this.data[j + this.n * k];
            ++it;
        }
    }
    return this.pivot(mat, true, false, true);
};

LUMatrix.prototype.determinant = function () {
    let det = (this.p[this.n] - this.n) % 2 ? -1 : 1;
    for (let i = 0; i < this.size; i += this.n + 1)
        det *= this.data[i];
    return det;
};

LUMatrix.prototype.invert = function () {
    this.inverted = this.inverted ? false : true;
    // invert L
    let it;
    for (let i = 0; i < this.n; ++i) {
        it = this.n * i;
        for (let j = 0; j < i; ++j) {
            let sum = 0;
            for (let k = j + 1; k < i; ++k)
                sum += this.data[k + this.n * i] * this.data[j + this.n * k];
            this.data[it] += sum;
            this.data[it] *= -1;
            ++it;
        }
    }
    // invert U    
    for (let i = this.n; --i > -1;) {
        const it_ii = i * (this.n + 1);
        this.data[it_ii] = 1 / this.data[it_ii];
        it = this.n * (i + 1);
        for (let j = this.n; --j > i;) {
            --it;
            let sum = 0;
            for (let k = i + 1; k < (j + 1); ++k)
                sum -= this.data[k + i * this.n] * this.data[j + k * this.n];
            this.data[it] = sum * this.data[it_ii];
        }
    }
};

LUMatrix.prototype._solveOverL = function (b) {
    for (let i = 1; i < this.n; ++i) {
        let it = i * this.n;
        for (let k = 0; k < i; ++k) {
            b.data[i] -= b.data[k] * this.data[it];
            ++it;
        }
    }
};
LUMatrix.prototype._solveOverU = function (b) {
    for (let i = this.n; --i > -1;) {
        let it = i * (this.n + 1) + 1;
        for (let k = i + 1; k < this.n; ++k) {
            b.data[i] -= b.data[k] * this.data[it];
            ++it;
        }
        b.data[i] /= this.data[i * (this.n + 1)];
    }
};
LUMatrix.prototype.solve = function (b, in_place) {
    if (!('is_matrix' in b) || !b.is_matrix || b.m != this.n)
        return null;

    if (this.inverted) {
        b = in_place ? b : new Matrix(b.m, b.n, Float64Array.from(b.data));
        this._solveOverU(b);
        this._solveOverL(b);
        return this.pivot(b, true, false, true);
    }
    const Pb = this.pivot(b, false, false, in_place);
    this._solveOverL(Pb);
    this._solveOverU(Pb);
    return Pb;
};


/*
    Numerical applications
*/
function NewtonRaphson(f, x0, tolerance, epsilon, maxItererations, stepSize, fp) { // fp can be null
    if (typeof f !== 'function')
        return null;

    const tol = typeof (tolerance) == "number" && tolerance > 0 ? tolerance : 1e-7;
    const eps = typeof (epsilon) == "number" && epsilon > 0 ? epsilon : Number.EPSILON;
    const maxIter = typeof (maxItererations) == "number" && maxItererations > 0 ? maxItererations : 20;
    const h = typeof (stepSize) == "number" && stepSize > 0 ? stepSize : 1e-4;
    const hr = 1 / h;

    var iter = 0;
    while (++iter < maxIter) {
        const y = f(x0);
        const yp = typeof (fp) !== 'function' ? (f(x0 - 2 * h) - f(x0 + 2 * h) + 8 * (f(x0 + h) - f(x0 - h))) * hr / 12 : fp(x0);
        //console.log({iter: iter, x: x0, y: y, yp: yp});
        if (Math.abs(yp) <= eps * Math.abs(y))
            return null;
        const x1 = x0 - y / yp;
        if (Math.abs(x1 - x0) <= tol * Math.abs(x1))
            return x1;
        x0 = x1;
    }
    return null;
}
function NewtonRaphsonMatrix(f, x0, tolerance, epsilon, maxItererations, stepSize, fp) // function f and fp (if fp exists) take 2 arguments, 1 x and 2 the output
{
    if (typeof f !== 'function' || !x0.BYTES_PER_ELEMENT || x0.BYTES_PER_ELEMENT != 8)
        return null;

    const tol = typeof (tolerance) == "number" && tolerance > 0 ? tolerance : 1e-7;
    const eps = typeof (epsilon) == "number" && epsilon > 0 ? epsilon : Number.EPSILON;
    const maxIter = typeof (maxItererations) == "number" && maxItererations > 0 ? maxItererations : 1e2;
    const h = typeof (stepSize) == "number" && stepSize > 0 ? stepSize : 1e-4;
    const hr = 1 / h;

    const length = x0.length;
    const yh = new Float64Array(5 * length); // -2, -1, 0, 1, 2
    const x0m = new Matrix(length, 1);
    x0m.data.set(x0);
    const x1m = new Matrix(length, 1);
    const J = new Matrix(length, length); // Jacobian matrix

    var iter = 0, i, j;
    while (++iter < maxIter) {
        f(x0m.data, yh.subarray(length * 2));
        if (typeof (fp) !== 'function') {
            for (i = 0; i < length; i++) {
                x1m.data.set(x0m.data);
                x1m.data[i] -= 2 * h;
                f(x1m.data, yh);
                x1m.data[i] += h;
                f(x1m.data, yh.subarray(length));
                x1m.data[i] += 2 * h;
                f(x1m.data, yh.subarray(3 * length));
                x1m.data[i] += h;
                f(x1m.data, yh.subarray(4 * length));

                for (j = 0; j < length; j++)
                    J.data[j * length + i] = (yh[j] - yh[length * 4 + j] + 8 * (yh[length * 3 + j] - yh[length + j])) * hr / 12;
            }
        }
        else
            fp(x0m.data, J.data);

        const J_lu = new LUMatrix(J, true);
        j = J_lu.determinant();

        //console.log({iter: iter, x: Float64Array.from(x0m.data), y: Float64Array.from(yh.subarray(2 * length, 3*length)), yp: j});
        i = yh.subarray(length * 2, length * 3).reduce((a, b) => Math.min(a, Math.abs(b)), Number.POSITIVE_INFINITY);
        if (Math.abs(j) <= eps * i)
            return null;
        
        x1m.data.set(yh.subarray(length * 2, length * 3));
        J_lu.solve(x1m, true);        
        x1m.mul(-1, true);
        x0m.addMatrix(x1m, true);
        j = 1;
        for (i = 0; i < length; i++) {
            j *= Math.abs(x0m.data[i]) * tol > Math.abs(x1m.data[i]);
        }

        if (j != 0)
            return x0m.data;        
    }

    return null;
}

function Bisect(f, a, b, tolerance, maxIterations, returnIterCount) { // prefer bisect
    if (typeof f !== 'function')
        return null;

    const xtol = typeof (tolerance) == "number" && tolerance > 0 ? Math.max(tolerance, 0.5 * Number.EPSILON * Math.abs(b)) : 1e-7;
    const rtol = 4 * Number.EPSILON;
    const maxIter = maxIterations > 0 ? maxIterations : 1000;

    let xpre = a, xcur = b;					// a, b
    let fpre = f(xpre), fcur = f(xcur);		// fa, fb

    if (fpre * fcur > 0)
        return null;
    if (fpre == 0)
        return returnIterCount ? [xpre, 0] : xpre;
    if (fcur == 0)
        return returnIterCount ? [xcur, 0] : xcur;

    let dm = xcur - xpre;
    for (let i = 0; i < maxIter; ++i) {
        dm /= 2;
        const xblk = xpre + dm;
        const fblk = f(xblk);
        if (fblk * fpre >= 0)
            xpre = xblk;
        if (fblk == 0 || Math.abs(fblk) < xtol + rtol * Math.abs(xblk)) {
            return returnIterCount ? [xblk, i + 1] : xblk;
        }
    }
    return null;
}
const Brent = function (f, a, b, tolerance, maxIterations, returnIterCount) {
    if (typeof f !== 'function')
        return null;

    const xtol = typeof (tolerance) == "number" && tolerance > 0 ? Math.max(tolerance, 0.5 * Number.EPSILON * Math.abs(b)) : 1e-7;
    const rtol = 4 * Number.EPSILON;
    const maxIter = maxIterations > 0 ? maxIterations : 500;

    // Based on SciPy implementation
    let xpre = a, xcur = b;					// a, b
    let fpre = f(xpre), fcur = f(xcur);		// fa, fb

    let xblk = 0, fblk = 0; // c, fc

    let spre = 0, scur = 0; // e, d
    let stry;

    if (fpre * fcur > 0)
        return null;
    if (fpre == 0)
        return returnIterCount ? [xpre, 0] : xpre;
    if (fcur == 0)
        return returnIterCount ? [xcur, 0] : xcur;

    for (let i = 0; i < maxIter; ++i) {
        if (fpre * fcur < 0) { // acEqual
            xblk = xpre;
            fblk = fpre;
            spre = scur = xcur - xpre;
        }
        if (Math.abs(fblk) < Math.abs(fcur)) { // acEqual
            xpre = xcur;
            xcur = xblk;
            xblk = xpre;

            fpre = fcur;
            fcur = fblk;
            fblk = fpre;
        }

        const delta = (xtol + rtol * Math.abs(xcur)) / 2;	// tol
        const sbis = (xblk - xcur) / 2;						// m
        if (fcur == 0 || Math.abs(sbis) < delta)
            return returnIterCount ? [xcur, i + 1] : xcur;


        if (Math.abs(spre) > delta && Math.abs(fcur) < Math.abs(fpre)) {
            if (xpre == xblk) { // secant (acEqual)
                stry = -fcur * (xcur - xpre) / (fcur - fpre);
            }
            else {	// extrapolate
                const dpre = (fpre - fcur) / (xpre - xcur);
                const dblk = (fblk - fcur) / (xblk - xcur);
                stry = -fcur * (fblk * dblk - fpre * dpre) / (dblk * dpre * (fblk - fpre));
            }
            if (2 * Math.abs(stry) < Math.min(Math.abs(spre), 3 * Math.abs(sbis) - delta)) {
                spre = scur;
                scur = stry;
            }
            else { // bisect fallback				
                spre = sbis;
                scur = sbis;
            }
        }
        else { // bisect			
            spre = sbis;
            scur = sbis;
        }

        xpre = xcur;
        fpre = fcur;
        if (Math.abs(scur) > delta)
            xcur += scur;
        else
            xcur += (sbis > 0 ? delta : -delta);
        fcur = f(xcur);
    }

    return null;
};
