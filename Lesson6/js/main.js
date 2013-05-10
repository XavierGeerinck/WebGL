window.onload = function() {
    WebGL.init();
};

var WebGL = {
    canvas: null,
    gl: null,

    pyramidVertexPositionBuffer: null,
    pyramidVertexColorBuffer: null,

    cubeVertexPositionBuffer: null,
    cubeVertexTextureCoordBuffer: null,
    cubeVertexIndexBuffer: null,

    // We create 2 matrixes for the model-view matrix and the projection matrix. Then we set them to empty.
    mvMatrix: null,

    // The projectionMatrix will ensure the perspective viewing that we listed.
    pMatrix: null,

    // the stack for the matrices that have to be drawn
    mvMatrixStack: null, // INIT IN INIT: function()!!

    shaderProgram: null, // INIT IN INIT: function()!!

    xRot: 0,
    xSpeed: 0,

    yRot: 0,
    ySpeed: 0,

    z: -5.0,
    filter: 0,
    // Keep the last time called
    lastTime: null, // INIT IN INIT: function()!!

    crateTextures: null,
    textureLoaded: false,
    currentlyPressedKeys: [],

    init: function() {
        // Init vars
        WebGL.canvas = document.getElementById("canvas");
        WebGL.mvMatrix = mat4.create();
        WebGL.pMatrix = mat4.create();
        WebGL.mvMatrixStack = [];
        WebGL.lastTime = 0;
        WebGL.crateTextures = [];
        WebGL.textureLoaded = false;

        // Load webGL
        WebGL.initGL();
        WebGL.initShaders();
        WebGL.initBuffers();
        WebGL.initTexture();

        WebGL.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        WebGL.gl.enable(WebGL.gl.DEPTH_TEST);

        // Key functions
        document.onkeydown = WebGL.handleKeyDown;
        document.onkeyup = WebGL.handleKeyUp;

        // FPS :D
        WebGL.tick();
    },

    tick: function() {
        // Browser code to optimize concurrent animations into a single reflow and repaint cycle leading to higher fidelity animation.
        // Also won't render when you are not on the tab in the browser.
        requestAnimFrame(WebGL.tick);
        if (WebGL.textureLoaded == true) {
            WebGL.handleKeys();
            WebGL.drawScene();
            WebGL.animate();
        }
    },

    handleKeys: function() {
        // Page up
        if (WebGL.currentlyPressedKeys[33]) {
            WebGL.z -= 0.05;
        }

        // Page Down
        if (WebGL.currentlyPressedKeys[34]) {
            WebGL.z += 0.05;
        }

        // Left cursor key
        if (WebGL.currentlyPressedKeys[37]) {
            WebGL.ySpeed -= 1;
        }

        // Right cursor key
        if (WebGL.currentlyPressedKeys[39]) {
            WebGL.ySpeed += 1;
        }

        // Up cursor key
        if (WebGL.currentlyPressedKeys[38]) {
            WebGL.xSpeed -= 1;
        }

        // Down cursor key
        if (WebGL.currentlyPressedKeys[40]) {
            WebGL.xSpeed += 1;
        }
    },

    animate: function() {
        var timeNow = new Date().getTime();
        if (WebGL.lastTime != 0) {
            var elapsed = timeNow - WebGL.lastTime;

            WebGL.xRot += (WebGL.xSpeed * elapsed) / 1000.0;
            WebGL.yRot += (WebGL.ySpeed * elapsed) / 1000.0;
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

    initTexture: function() {
        var crateImage = new Image();

        for (var i = 0; i < 3; i++) {
            var texture = WebGL.gl.createTexture();
            texture.image = crateImage;
            WebGL.crateTextures.push(texture);
        }

        crateImage.onload = function() {
            WebGL.handleLoadedTexture(WebGL.crateTextures);
        };

        crateImage.src = "images/texture.gif";
    },

    handleLoadedTexture: function(textures) {
        WebGL.gl.pixelStorei(WebGL.gl.UNPACK_FLIP_Y_WEBGL, true);

        // Texture 1
        // nearest filtering: WebGL uses a filter to determine the color of a given point by looking for the nearest point in the original image.
        // When the image gets scaleed up it will look blocky.
        WebGL.gl.bindTexture(WebGL.gl.TEXTURE_2D, textures[0]);
        WebGL.gl.texImage2D(WebGL.gl.TEXTURE_2D, 0, WebGL.gl.RGBA, WebGL.gl.RGBA, WebGL.gl.UNSIGNED_BYTE, textures[0].image);
        WebGL.gl.texParameteri(WebGL.gl.TEXTURE_2D, WebGL.gl.TEXTURE_MAG_FILTER, WebGL.gl.NEAREST);
        WebGL.gl.texParameteri(WebGL.gl.TEXTURE_2D, WebGL.gl.TEXTURE_MIN_FILTER, WebGL.gl.NEAREST);

        // Texture 2
        // Linear filtering will work better on up scaled textures, it will linear interpolate between pixels (means a black and white pixel together then the middle is grey)
        // --> Edges will look more blurred.
        WebGL.gl.bindTexture(WebGL.gl.TEXTURE_2D, textures[1]);
        WebGL.gl.texImage2D(WebGL.gl.TEXTURE_2D, 0, WebGL.gl.RGBA, WebGL.gl.RGBA, WebGL.gl.UNSIGNED_BYTE, textures[1].image);
        WebGL.gl.texParameteri(WebGL.gl.TEXTURE_2D, WebGL.gl.TEXTURE_MAG_FILTER, WebGL.gl.LINEAR);
        WebGL.gl.texParameteri(WebGL.gl.TEXTURE_2D, WebGL.gl.TEXTURE_MIN_FILTER, WebGL.gl.LINEAR);

        // Texture 3
        //
        WebGL.gl.bindTexture(WebGL.gl.TEXTURE_2D, textures[2]);
        WebGL.gl.texImage2D(WebGL.gl.TEXTURE_2D, 0, WebGL.gl.RGBA, WebGL.gl.RGBA, WebGL.gl.UNSIGNED_BYTE, textures[2].image);
        WebGL.gl.texParameteri(WebGL.gl.TEXTURE_2D, WebGL.gl.TEXTURE_MAG_FILTER, WebGL.gl.LINEAR);
        WebGL.gl.texParameteri(WebGL.gl.TEXTURE_2D, WebGL.gl.TEXTURE_MIN_FILTER, WebGL.gl.LINEAR_MIPMAP_NEAREST);
        WebGL.gl.generateMipmap(WebGL.gl.TEXTURE_2D);

        // Reset
        WebGL.gl.bindTexture(WebGL.gl.TEXTURE_2D, null);

        // Say that the texture has been loaded.
        WebGL.textureLoaded = true;
    },

    /**
     * Push everything to the GFX card that we created in the buffers
     */
    drawScene: function() {
        WebGL.gl.viewport(0, 0, WebGL.gl.viewportWidth, WebGL.gl.viewportHeight);
        WebGL.gl.clear(WebGL.gl.COLOR_BUFFER_BIT | WebGL.gl.DEPTH_BUFFER_BIT);

        mat4.perspective(WebGL.pMatrix, 45, WebGL.gl.viewportWidth / WebGL.gl.viewportHeight, 0.1, 100.0);

        mat4.identity(WebGL.mvMatrix);

        mat4.translate(WebGL.mvMatrix, WebGL.mvMatrix, vec3.fromValues(0.0, 0.0, WebGL.z));

        mat4.rotate(WebGL.mvMatrix, WebGL.mvMatrix, WebGL.degToRad(WebGL.xRot), vec3.fromValues(1, 0, 0));
        mat4.rotate(WebGL.mvMatrix, WebGL.mvMatrix, WebGL.degToRad(WebGL.yRot), vec3.fromValues(0, 1, 0));

        WebGL.mvPushMatrix();

        // Use square buffers for the drawing
        WebGL.gl.bindBuffer(WebGL.gl.ARRAY_BUFFER, WebGL.cubeVertexPositionBuffer);
        WebGL.gl.vertexAttribPointer(WebGL.shaderProgram.vertexPositionAttribute, WebGL.cubeVertexPositionBuffer.itemSize, WebGL.gl.FLOAT, false, 0, 0);

        WebGL.gl.bindBuffer(WebGL.gl.ARRAY_BUFFER, WebGL.cubeVertexTextureCoordBuffer);
        WebGL.gl.vertexAttribPointer(WebGL.shaderProgram.textureCoordAttribute, WebGL.cubeVertexTextureCoordBuffer.itemSize, WebGL.gl.FLOAT, false, 0, 0);

        /**
         * Tell what filter to use
         */
        WebGL.gl.activeTexture(WebGL.gl.TEXTURE0);
        WebGL.gl.bindTexture(WebGL.gl.TEXTURE_2D, WebGL.crateTextures[WebGL.filter]);
        WebGL.gl.uniform1i(WebGL.shaderProgram.samplerUniform, 0);

        WebGL.gl.bindBuffer(WebGL.gl.ELEMENT_ARRAY_BUFFER, WebGL.cubeVertexIndexBuffer);
        WebGL.setMatrixUniforms();
        WebGL.gl.drawElements(WebGL.gl.TRIANGLES, WebGL.cubeVertexIndexBuffer.numItems, WebGL.gl.UNSIGNED_SHORT, 0);

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
        // If you go back to the .bindBuffer for pyramidVertexPositionBuffer then you know that are vertexes are sitting here.
        WebGL.shaderProgram.vertexPositionAttribute = WebGL.gl.getAttribLocation(WebGL.shaderProgram, "aVertexPosition");
        WebGL.gl.enableVertexAttribArray(WebGL.shaderProgram.vertexPositionAttribute);

        // Add textures
        WebGL.shaderProgram.textureCoordAttribute = WebGL.gl.getAttribLocation(WebGL.shaderProgram, "aTextureCoord");
        WebGL.gl.enableVertexAttribArray(WebGL.shaderProgram.textureCoordAttribute);

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
         * Create Square
         */
        WebGL.cubeVertexPositionBuffer = WebGL.gl.createBuffer();
        WebGL.gl.bindBuffer(WebGL.gl.ARRAY_BUFFER, WebGL.cubeVertexPositionBuffer);
        var vertices = [
            // Front face
           -1.0, -1.0,  1.0,
            1.0, -1.0,  1.0,
            1.0,  1.0,  1.0,
           -1.0,  1.0,  1.0,

            // Back face
           -1.0, -1.0, -1.0,
           -1.0,  1.0, -1.0,
            1.0,  1.0, -1.0,
            1.0, -1.0, -1.0,

            // Top face
           -1.0,  1.0, -1.0,
           -1.0,  1.0,  1.0,
            1.0,  1.0,  1.0,
            1.0,  1.0, -1.0,

            // Bottom face
           -1.0, -1.0, -1.0,
            1.0, -1.0, -1.0,
            1.0, -1.0,  1.0,
           -1.0, -1.0,  1.0,

            // Right face
            1.0, -1.0, -1.0,
            1.0,  1.0, -1.0,
            1.0,  1.0,  1.0,
            1.0, -1.0,  1.0,

            // Left face
            -1.0, -1.0, -1.0,
            -1.0, -1.0,  1.0,
            -1.0,  1.0,  1.0,
            -1.0,  1.0, -1.0,
        ];
        WebGL.gl.bufferData(WebGL.gl.ARRAY_BUFFER, new Float32Array(vertices), WebGL.gl.STATIC_DRAW);
        WebGL.cubeVertexPositionBuffer.itemSize = 3;
        WebGL.cubeVertexPositionBuffer.numItems = 24;

        /**
         * We apply the texture, we got the textureCoords which specufy a per-vertex combination of the x, y coordinates
         * of the vertex lies in the texture
         */
        // Texture coordinates
        WebGL.cubeVertexTextureCoordBuffer = WebGL.gl.createBuffer();
        WebGL.gl.bindBuffer(WebGL.gl.ARRAY_BUFFER, WebGL.cubeVertexTextureCoordBuffer);
        var textureCoords = [
            // Front face
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,

            // Back face
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
            0.0, 0.0,

            // Top face
            0.0, 1.0,
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,

            // Bottom face
            1.0, 1.0,
            0.0, 1.0,
            0.0, 0.0,
            1.0, 0.0,

            // Right face
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
            0.0, 0.0,

            // Left face
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0
        ];
        WebGL.gl.bufferData(WebGL.gl.ARRAY_BUFFER, new Float32Array(textureCoords), WebGL.gl.STATIC_DRAW);
        WebGL.cubeVertexTextureCoordBuffer.itemSize = 2;
        WebGL.cubeVertexTextureCoordBuffer.numItems = 24;

        // Create squares by combining triangles
        WebGL.cubeVertexIndexBuffer = WebGL.gl.createBuffer();
        WebGL.gl.bindBuffer(WebGL.gl.ELEMENT_ARRAY_BUFFER, WebGL.cubeVertexIndexBuffer);
        var cubeVertexIndices = [
            0, 1, 2,      0, 2, 3,    // Front face
            4, 5, 6,      4, 6, 7,    // Back face
            8, 9, 10,     8, 10, 11,  // Top face
            12, 13, 14,   12, 14, 15, // Bottom face
            16, 17, 18,   16, 18, 19, // Right face
            20, 21, 22,   20, 22, 23  // Left face
        ]
        WebGL.gl.bufferData(WebGL.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeVertexIndices), WebGL.gl.STATIC_DRAW);
        WebGL.cubeVertexIndexBuffer.itemSize = 1;
        WebGL.cubeVertexIndexBuffer.numItems = 36;
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
    },

    handleKeyDown: function(event) {
        WebGL.currentlyPressedKeys[event.keyCode] = true;

        if (String.fromCharCode(event.keyCode) == "F") {
            WebGL.filter += 1;

            if (WebGL.filter == 3) {
                WebGL.filter = 0;
            }
        }
    },

    handleKeyUp: function(event) {
        WebGL.currentlyPressedKeys[event.keyCode] = false;
    }
};