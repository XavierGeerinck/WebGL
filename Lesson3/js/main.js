window.onload = function() {
    WebGL.init();
};

var WebGL = {
    canvas: null,
    gl: null,

    triangleVertexPositionBuffer: null,
    triangleVertexColorBuffer: null,

    squareVertexPositionBuffer: null,
    squareVertexColorBuffer: null,

    // We create 2 matrixes for the model-view matrix and the projection matrix. Then we set them to empty.
    mvMatrix: null,

    // The projectionMatrix will ensure the perspective viewing that we listed.
    pMatrix: null,

    // the stack for the matrices that have to be drawn
    mvMatrixStack: null, // INIT IN INIT: function()!!

    shaderProgram: null, // INIT IN INIT: function()!!

    // Rotation for the triangle and square
    rTri: null, // INIT IN INIT: function()!!
    rSquare: null, // INIT IN INIT: function()!!

    // Keep the last time called
    lastTime: null, // INIT IN INIT: function()!!

    init: function() {
        // Init vars
        WebGL.canvas = document.getElementById("canvas");
        WebGL.mvMatrix = mat4.create();
        WebGL.pMatrix = mat4.create();
        WebGL.mvMatrixStack = [];
        WebGL.rTri = 0;
        WebGL.rSquare = 0;
        WebGL.lastTime = 0;

        // Load webGL
        WebGL.initGL();
        WebGL.initShaders();
        WebGL.initBuffers();

        // clear canvas and make it black.
        WebGL.gl.clearColor(0.0, 0.0, 0.0, 1.0);

        // Do depth test to make sure that things drawn in front of objects are hiding the ones behind them.
        WebGL.gl.enable(WebGL.gl.DEPTH_TEST);

        // FPS :D
        WebGL.tick();
    },

    tick: function() {
        // Browser code to optimize concurrent animations into a single reflow and repaint cycle leading to higher fidelity animation.
        // Also won't render when you are not on the tab in the browser.
        requestAnimFrame(WebGL.tick);
        WebGL.drawScene();
        WebGL.animate();
    },

    animate: function() {
        var timeNow = new Date().getTime();
        if (WebGL.lastTime != 0) {
            var elapsed = timeNow - WebGL.lastTime;

            WebGL.rTri += (90 * elapsed) / 1000.0; // 90 degrees  / second
            WebGL.rSquare += (75 * elapsed) / 1000.0; // 75 degrees / second
        }

        WebGL.lastTime = timeNow;
    },

    initGL: function() {
        try {
            WebGL.gl =  WebGL.canvas.getContext("webgl") || WebGL.canvas.getContext("experimental-webgl");
            WebGL.gl.viewportWidth = WebGL.canvas.width;
            WebGL.gl.viewportHeight = WebGL.canvas.height;
        } catch(e) {
            console.log(e);
        }

        if (!WebGL.gl) {
            console.log("Could not start WebGL.");
        }
    },

    /**
     * Push everything to the GFX card that we created in the buffers
     */
    drawScene: function() {
        // Tell WebGL we are using the width and height of our canvas
        WebGL.gl.viewport(0, 0, WebGL.gl.viewportWidth, WebGL.gl.viewportHeight);

        // Clear canvas in preperation for drawing on it.
        WebGL.gl.clear(WebGL.gl.COLOR_BUFFER_BIT | WebGL.gl.DEPTH_BUFFER_BIT);
        mat4.perspective(WebGL.pMatrix, 45, WebGL.gl.viewportWidth / WebGL.gl.viewportHeight, 0.1, 100.0);
        mat4.identity(WebGL.mvMatrix);

        /**
         * Draw triangle
         */
        mat4.translate(WebGL.mvMatrix, WebGL.mvMatrix, vec3.fromValues(-2.0, 0.0, -7.0));

        // Put on stack
        WebGL.mvPushMatrix();

        // Rotate the Matrix of the triangle by the rTri degrees.
        mat4.rotate(WebGL.mvMatrix, WebGL.mvMatrix, WebGL.degToRad(WebGL.rTri), vec3.fromValues(0, 1, 0));

        // We call the buffer that we made for the triangle vertexes and saved in our gpu and use those to calculate the vertexes.
        WebGL.gl.bindBuffer(WebGL.gl.ARRAY_BUFFER, WebGL.triangleVertexPositionBuffer);
        WebGL.gl.vertexAttribPointer(WebGL.shaderProgram.vertexPositionAttribute, WebGL.triangleVertexPositionBuffer.itemSize, WebGL.gl.FLOAT, false, 0, 0);

        // Add colors
        WebGL.gl.bindBuffer(WebGL.gl.ARRAY_BUFFER, WebGL.triangleVertexColorBuffer);
        WebGL.gl.vertexAttribPointer(WebGL.shaderProgram.vertexColorAttribute, WebGL.triangleVertexColorBuffer.itemSize, WebGL.gl.FLOAT, false, 0, 0);

        // Take our model-view matrix and projection matrix, this will be use to make sure that we can do all the moving through the mvMatrix
        // THe problem is that this is being done on the JS private space, setMatrixUniforms will move it to the GFX card.
        WebGL.setMatrixUniforms();

        // now we say that WebGL has an array of numbers and should treat them as vertexes, now we say to draw the triangles, starting with item 0 till the numItems element
        WebGL.gl.drawArrays(WebGL.gl.TRIANGLES, 0, WebGL.triangleVertexPositionBuffer.numItems);

        // Remove from stack
        WebGL.mvPopMatrix();

        /**
         * Draw Square
         */
        // Move our mvMatrix 3  units to the right.
        mat4.translate(WebGL.mvMatrix, WebGL.mvMatrix, vec3.fromValues(4.0, 0.0, 0.0));

        WebGL.mvPushMatrix();
        mat4.rotate(WebGL.mvMatrix, WebGL.mvMatrix, WebGL.degToRad(WebGL.rSquare), vec3.fromValues(1, 0, 0));

        // Use square buffers for the drawing
        WebGL.gl.bindBuffer(WebGL.gl.ARRAY_BUFFER, WebGL.squareVertexPositionBuffer);
        WebGL.gl.vertexAttribPointer(WebGL.shaderProgram.vertexPositionAttribute, WebGL.squareVertexPositionBuffer.itemSize, WebGL.gl.FLOAT, false, 0, 0);

        // Add colors
        WebGL.gl.bindBuffer(WebGL.gl.ARRAY_BUFFER, WebGL.squareVertexColorBuffer);
        WebGL.gl.vertexAttribPointer(WebGL.shaderProgram.vertexColorAttribute, WebGL.squareVertexColorBuffer.itemSize, WebGL.gl.FLOAT, false, 0, 0);

        // Again say to let GPU calculate it.
        WebGL.setMatrixUniforms();

        // TRIANGLE_STRIP is a strip of triangles, first 3 vertices are the first triangle, then the next triangle are the last 2 vertices plys the next one, ...
        // This is because we draw a square based on 2 triangles.
        WebGL.gl.drawArrays(WebGL.gl.TRIANGLE_STRIP, 0, WebGL.squareVertexPositionBuffer.numItems);

        WebGL.mvPopMatrix();
    },

    initShaders: function() {
        var fragmentShader = WebGL.getShader(WebGL.gl, "shader-fs");
        var vertexShader = WebGL.getShader(WebGL.gl, "shader-vs");

        WebGL.shaderProgram = WebGL.gl.createProgram();
        WebGL.gl.attachShader(WebGL.shaderProgram, vertexShader);
        WebGL.gl.attachShader(WebGL.shaderProgram, fragmentShader);
        WebGL.gl.linkProgram(WebGL.shaderProgram);

        if (!WebGL.gl.getProgramParameter(WebGL.shaderProgram, WebGL.gl.LINK_STATUS)) {
            console.log("Could not initialise shaders.");
        }

        WebGL.gl.useProgram(WebGL.shaderProgram);

        // We get a reference to an "attribute" and we use js to set this to a attrib
        // If you go back to the .bindBuffer for triangleVertexPositionBuffer then you know that are vertexes are sitting here.
        WebGL.shaderProgram.vertexPositionAttribute = WebGL.gl.getAttribLocation(WebGL.shaderProgram, "aVertexPosition");
        WebGL.gl.enableVertexAttribArray(WebGL.shaderProgram.vertexPositionAttribute);

        // Add colors
        WebGL.shaderProgram.vertexColorAttribute = WebGL.gl.getAttribLocation(WebGL.shaderProgram, "aVertexColor");
        WebGL.gl.enableVertexAttribArray(WebGL.shaderProgram.vertexColorAttribute);

        // Get 2 more values from the program, are just some temp settings on the shaderprogram.
        WebGL.shaderProgram.pMatrixUniform = WebGL.gl.getUniformLocation(WebGL.shaderProgram,  "uPMatrix");
        WebGL.shaderProgram.mvMatrixUniform = WebGL.gl.getUniformLocation(WebGL.shaderProgram, "uMVMatrix");
    },

    getShader: function(gl, id) {
        var shaderScript = document.getElementById(id);
        if (!shaderScript) {
            return null;
        }

        var str = "";
        var k = shaderScript.firstChild;
        while (k) {
            if (k.nodeType == 3)
                str += k.textContent;
            k = k.nextSibling;
        }

        var shader;
        if (shaderScript.type == "x-shader/x-fragment") {
            shader = gl.createShader(gl.FRAGMENT_SHADER);
        } else if (shaderScript.type == "x-shader/x-vertex") {
            shader = gl.createShader(gl.VERTEX_SHADER);
        } else {
            return null;
        }

        gl.shaderSource(shader, str);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.log(gl.getShaderInfoLog(shader));
            return null;
        }

        return shader;
    },

    initBuffers: function() {
        /**
         * Create Triangle
         */
        WebGL.triangleVertexPositionBuffer = WebGL.gl.createBuffer();

        // Use this buffer (WebGL.TriangleVertexPositionBuffer) for the next code, use a ARRAY_BUFFER
        WebGL.gl.bindBuffer(WebGL.gl.ARRAY_BUFFER, WebGL.triangleVertexPositionBuffer);

        // Specify vertices, Note the center is 0.0, 0.0, 0.0 we create 3 points
        var vertices = [
             0.0,  1.0, 0.0,
            -1.0, -1.0, 0.0,
             1.0, -1.0, 0.0
        ];

        // create float32 array and tell js to use this buffer
        WebGL.gl.bufferData(WebGL.gl.ARRAY_BUFFER, new Float32Array(vertices), WebGL.gl.STATIC_DRAW);

        // Set variables to say that we got 3 vertices (=numItems) of size 3 (=itemSize)
        WebGL.triangleVertexPositionBuffer.itemSize = 3;
        WebGL.triangleVertexPositionBuffer.numItems = 3;

        // Add colors
        WebGL.triangleVertexColorBuffer = WebGL.gl.createBuffer();
        WebGL.gl.bindBuffer(WebGL.gl.ARRAY_BUFFER, WebGL.triangleVertexColorBuffer);
        // The colors are specified as RED, GREEN, BLUE, ALPHA and we got 3 vertices to color in.
        var colors = [
            1.0, 0.0, 0.0, 1.0,
            0.0, 1.0, 0.0, 1.0,
            0.0, 0.0, 1.0, 1.0
        ];
        WebGL.gl.bufferData(WebGL.gl.ARRAY_BUFFER, new Float32Array(colors), WebGL.gl.STATIC_DRAW);
        WebGL.triangleVertexColorBuffer.itemSize = 4;
        WebGL.triangleVertexColorBuffer.numItems = 3;


        /**
         * Create Square
         */
        WebGL.squareVertexPositionBuffer = WebGL.gl.createBuffer();
        WebGL.gl.bindBuffer(WebGL.gl.ARRAY_BUFFER, WebGL.squareVertexPositionBuffer);
        var vertices = [
             1.0,  1.0, 0.0,
            -1.0,  1.0, 0.0,
             1.0, -1.0, 0.0,
            -1.0, -1.0, 0.0
        ];
        WebGL.gl.bufferData(WebGL.gl.ARRAY_BUFFER, new Float32Array(vertices), WebGL.gl.STATIC_DRAW);
        WebGL.squareVertexPositionBuffer.itemSize = 3;
        WebGL.squareVertexPositionBuffer.numItems = 4;

        // Add colors
        WebGL.squareVertexColorBuffer = WebGL.gl.createBuffer();
        WebGL.gl.bindBuffer(WebGL.gl.ARRAY_BUFFER, WebGL.squareVertexColorBuffer);
        colors = []
        for (var i=0; i < 4; i++) {
            colors = colors.concat([0.5, 0.5, 1.0, 1.0]);
        }
        WebGL.gl.bufferData(WebGL.gl.ARRAY_BUFFER, new Float32Array(colors), WebGL.gl.STATIC_DRAW);
        WebGL.squareVertexColorBuffer.itemSize = 4;
        WebGL.squareVertexColorBuffer.numItems = 4;
    },

    setMatrixUniforms: function() {
        WebGL.gl.uniformMatrix4fv(WebGL.shaderProgram.pMatrixUniform, false, WebGL.pMatrix);
        WebGL.gl.uniformMatrix4fv(WebGL.shaderProgram.mvMatrixUniform, false, WebGL.mvMatrix);
    },

    mvPushMatrix: function() {
        var copy = mat4.create();
        mat4.copy(copy, WebGL.mvMatrix);
        WebGL.mvMatrixStack.push(copy);
    },

    mvPopMatrix: function() {
        if (WebGL.mvMatrixStack.length == 0) {
            throw "Invalid popMatrix";
        }

        WebGL.mvMatrix = WebGL.mvMatrixStack.pop();
    },

    degToRad: function(degrees) {
        return degrees * Math.PI / 180;
    }
};