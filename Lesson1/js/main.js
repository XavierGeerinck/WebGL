window.onload = function() {
    WebGL.init();
};

var WebGL = {
    canvas: null,
    gl: null,
    triangleVertexPositionBuffer: null,
    squareVertexPositionBuffer: null,

    // We create 2 matrixes for the model-view matrix and the projection matrix. Then we set them to empty.
    mvMatrix: null,

    // The projectionMatrix will ensure the perspective viewing that we listed.
    pMatrix: null,

    shaderProgram: null,

    init: function() {
        // Init vars
        WebGL.canvas = document.getElementById("canvas");
        WebGL.mvMatrix = mat4.create();
        WebGL.pMatrix = mat4.create();

        // Load webGL
        WebGL.initGL();
        WebGL.initShaders();
        WebGL.initBuffers();

        // clear canvas and make it black.
        WebGL.gl.clearColor(0.0, 0.0, 0.0, 1.0);

        // Do depth test to make sure that things drawn in front of objects are hiding the ones behind them.
        WebGL.gl.enable(WebGL.gl.DEPTH_TEST);

        WebGL.drawScene();
    },

    initGL: function() {
        try {
            WebGL.gl =  WebGL.canvas.getContext("webgl") || WebGL.canvas.getContext("experimental-webgl");
            WebGL.gl.viewportWidth = WebGL.canvas.width;
            WebGL.gl.viewportHeight = WebGL.canvas.height;

            console.log(WebGL.canvas.width);
            console.log(WebGL.canvas.height);
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

        // Set the perspective we are drawing, by default WebGL uses a orthographic projection (= Things that are far
        // away will be drawn as things that are close)
        // So we say it to change the perspective, we change it to 45 degrees, and a width-to-height ration of our canvas.
        // We also say it that we do not want to see things that are closer then 0.1 unites to our viewpoints
        // and that we don't want to see things that are further then 100 units.
        // We use the mat4 function and we use a intriguingly-named variable pMatrix.
        // mat4.perspective(out, fovy, aspect, near, far)
        mat4.perspective(WebGL.pMatrix, 45, WebGL.gl.viewportWidth / WebGL.gl.viewportHeight, 0.1, 100.0);

        // Start drawing
        // Important to know, the mat4.identity is our identity matrix (http://en.wikipedia.org/wiki/Identity_matrix)
        // This represents our base matrix, it doesn't move. We want the object do do something so we say that it should
        // move, rotate, ... we store this in a combined matrix (It holds all the different rotations/ movements)
        // Normally you do matrix * matrix for one transformation.
        // the matrix that we use for the move / rotate state is the model-view matrix (mvMatrix here)
        // We use a library to do all this because it exists and we do not want to reinvent the wheel with math x) (https://github.com/toji/gl-matrix)
        // mat4.identity(out)
        mat4.identity(WebGL.mvMatrix);

        /**
         * Draw triangle
         */
        // Write code to draw triangle on the left-hand side of our canvas
        // We moved to the centre of the 3D space by setting mvMatrix to the identity matrix, we start by moving 1.5 units left (x axis)
        //and 7 units into the scene (z axis)
        // mat4.translate will multiply the given matrix by a translation matrix.
        // mat4.translate(out, a, v)
        // vec3.fromValues(x, y, z)
        mat4.translate(WebGL.mvMatrix, WebGL.mvMatrix, vec3.fromValues(-2.0, 0.0, -7.0));

        // We call the buffer that we made for the triangle vertexes and saved in our gpu and use those to calculate the vertexes.
        WebGL.gl.bindBuffer(WebGL.gl.ARRAY_BUFFER, WebGL.triangleVertexPositionBuffer);
        WebGL.gl.vertexAttribPointer(WebGL.shaderProgram.vertexPositionAttribute, WebGL.triangleVertexPositionBuffer.itemSize, WebGL.gl.FLOAT, false, 0, 0);

        // Take our model-view matrix and projection matrix, this will be use to make sure that we can do all the moving through the mvMatrix
        // THe problem is that this is being done on the JS private space, setMatrixUniforms will move it to the GFX card.
        WebGL.setMatrixUniforms();

        // now we say that WebGL has an array of numbers and should treat them as vertexes, now we say to draw the triangles, starting with item 0 till the numItems element
        WebGL.gl.drawArrays(WebGL.gl.TRIANGLES, 0, WebGL.triangleVertexPositionBuffer.numItems);


        /**
         * Draw Square
         */
        // Move our mvMatrix 3  units to the right.
        mat4.translate(WebGL.mvMatrix, WebGL.mvMatrix, vec3.fromValues(4.0, 0.0, 0.0));

        // Use square buffers for the drawing
        WebGL.gl.bindBuffer(WebGL.gl.ARRAY_BUFFER, WebGL.squareVertexPositionBuffer);
        WebGL.gl.vertexAttribPointer(WebGL.shaderProgram.vertexPositionAttribute, WebGL.squareVertexPositionBuffer.itemSize, WebGL.gl.FLOAT, false, 0, 0);

        // Again say to let GPU calculate it.
        WebGL.setMatrixUniforms();

        // TRIANGLE_STRIP is a strip of triangles, first 3 vertices are the first triangle, then the next triangle are the last 2 vertices plys the next one, ...
        // This is because we draw a square based on 2 triangles.
        WebGL.gl.drawArrays(WebGL.gl.TRIANGLE_STRIP, 0, WebGL.squareVertexPositionBuffer.numItems);
    },

    /**
     * Shaders: Shaders are bits of code that can do anything that they want before the scene is drawn (Colouring, Shading, ...)
     * Advantages of these are:
     * - They run on the GFX card instead of the Javascript private space.
     * - The kind of transformation that they can do can be really convenient
     *
     * We use them here since we want this example running on the GFX card.
     */
    initShaders: function() {
        // Create a fragment shader and a vertex shader, then attach them to a program,
        // a program is a bit of code that lives on the WebGL side of the system, you can look at it as something that runs from the GFX card.
        // You can associate a number of shaders with it, each of which you can see as a snippet of code, within that program
        // we can exactly hold one fragment and one vertex shader.
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

        // Get 2 more values from the program, are just some temp settings on the shaderprogram.
        WebGL.shaderProgram.pMatrixUniform = WebGL.gl.getUniformLocation(WebGL.shaderProgram,  "uPMatrix");
        WebGL.shaderProgram.mvMatrixUniform = WebGL.gl.getUniformLocation(WebGL.shaderProgram, "uMVMatrix");
    },

    /**
     * Look for an element in our HTML page that has an ID that matches a parameter passed in.
     * Create a fragment or a vertex shader based on its type and pass it of to WebGL to be compiled into a form
     * that the GFX card can read.
     * @param gl
     * @param id
     */
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

    /**
     * Buffers hold the details of the triangle and the square
     *
     * The vertexes that we store in our buffer are the points in 3D space that will define our triangle. (So 3)
     * this buffer is a bit of memory on the gfx card,  we put them there on init, and we call them on drawing.
     * By doing this we make the code faster, this is because we store the shape and we can reuse it multiple times.
     * When we got simple shapes, it won't make a lot of difference, but with shapes with multiple vertexes it is a really good thing
     */
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
    },

    /**
     * Using the references to the uniforms that represent the projection matrix and the model-view matrix
     * we send WebGL the values from our javascript style matrices.
     */
    setMatrixUniforms: function() {
        WebGL.gl.uniformMatrix4fv(WebGL.shaderProgram.pMatrixUniform, false, WebGL.pMatrix);
        WebGL.gl.uniformMatrix4fv(WebGL.shaderProgram.mvMatrixUniform, false, WebGL.mvMatrix);
    }
};