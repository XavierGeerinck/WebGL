window.onload = function() {
    WebGL.init();
};

var WebGL = {
    canvas: null,
    gl: null,

    cubeVertexPositionBuffer: null,
    cubeVertexTextureCoordBuffer: null,
    cubeVertexNormalBuffer: null,
    cubeVertexIndexBuffer: null,
    mvMatrix: null,
    pMatrix: null,
    mvMatrixStack: null,
    shaderProgram: null,
    xRot: 0,
    xSpeed: 3,
    yRot: 0,
    ySpeed:-3,
    z: -5.0,
    lastTime: null,
    crateTexture: null,
    textureLoaded: false,
    currentlyPressedKeys: [],

    init: function() {
        // Init vars
        WebGL.canvas = document.getElementById("canvas");
        WebGL.mvMatrix = mat4.create();
        WebGL.pMatrix = mat4.create();
        WebGL.mvMatrixStack = [];
        WebGL.lastTime = 0;
        WebGL.crateTexture = null;
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
        WebGL.crateTexture = WebGL.gl.createTexture();
        WebGL.crateTexture.image = new Image();
        WebGL.crateTexture.image.onload = function() {
            WebGL.handleLoadedTexture(WebGL.crateTexture);
        }

        WebGL.crateTexture.image.src = "images/texture.gif";
    },

    handleLoadedTexture: function(texture) {
        WebGL.gl.pixelStorei(WebGL.gl.UNPACK_FLIP_Y_WEBGL, true);

        WebGL.gl.bindTexture(WebGL.gl.TEXTURE_2D, texture);
        WebGL.gl.texImage2D(WebGL.gl.TEXTURE_2D, 0, WebGL.gl.RGBA, WebGL.gl.RGBA, WebGL.gl.UNSIGNED_BYTE, texture.image);
        WebGL.gl.texParameteri(WebGL.gl.TEXTURE_2D, WebGL.gl.TEXTURE_MAG_FILTER, WebGL.gl.LINEAR);
        WebGL.gl.texParameteri(WebGL.gl.TEXTURE_2D, WebGL.gl.TEXTURE_MIN_FILTER, WebGL.gl.LINEAR_MIPMAP_NEAREST);
        WebGL.gl.generateMipmap(WebGL.gl.TEXTURE_2D);

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

        WebGL.gl.bindBuffer(WebGL.gl.ARRAY_BUFFER, WebGL.cubeVertexNormalBuffer);
        WebGL.gl.vertexAttribPointer(WebGL.shaderProgram.vertexNormalAttribute, WebGL.cubeVertexNormalBuffer.itemSize, WebGL.gl.FLOAT, false, 0, 0);

        WebGL.gl.bindBuffer(WebGL.gl.ARRAY_BUFFER, WebGL.cubeVertexTextureCoordBuffer);
        WebGL.gl.vertexAttribPointer(WebGL.shaderProgram.textureCoordAttribute, WebGL.cubeVertexTextureCoordBuffer.itemSize, WebGL.gl.FLOAT, false, 0, 0);

        /**
         * Tell what filter to use
         */
        WebGL.gl.activeTexture(WebGL.gl.TEXTURE0);
        WebGL.gl.bindTexture(WebGL.gl.TEXTURE_2D, WebGL.crateTexture);
        WebGL.gl.uniform1i(WebGL.shaderProgram.samplerUniform, 0);

        var lighting = document.getElementById("lighting").checked;
        WebGL.gl.uniform1i(WebGL.shaderProgram.useLightingUniform, lighting);

        if (lighting) {
            // If we enable lighting then we are going to say that the ambient lighting RGB values are going to be read
            // Then we say that we are going to adapt the lighting direction vector before passing it to the shader
            // vec3.normalize will scale up or down so that the length is one. (co of angel between 2 values is equal to to the dot product and those 2 are equal to 1)

            WebGL.gl.uniform3f(
                WebGL.shaderProgram.ambientColorUniform,
                parseFloat(document.getElementById("ambientR").value),
                parseFloat(document.getElementById("ambientG").value),
                parseFloat(document.getElementById("ambientB").value)
            );

            var lightingDirection  = [
                parseFloat(document.getElementById("lightDirectionX").value),
                parseFloat(document.getElementById("lightDirectionY").value),
                parseFloat(document.getElementById("lightDirectionZ").value)
            ];

            var adjustedLD = vec3.create();
            vec3.normalize(adjustedLD, lightingDirection);
            vec3.scale(adjustedLD, adjustedLD, -1);
            WebGL.gl.uniform3fv(WebGL.shaderProgram.lightingDirectionUniform, adjustedLD);

            WebGL.gl.uniform3f(
                WebGL.shaderProgram.directionalColorUniform,
                parseFloat(document.getElementById("directionalR").value),
                parseFloat(document.getElementById("directionalG").value),
                parseFloat(document.getElementById("directionalB").value)
            );
        }

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
            alert("Could not initialise shaders");
        }

        WebGL.gl.useProgram(WebGL.shaderProgram);

        WebGL.shaderProgram.vertexPositionAttribute = WebGL.gl.getAttribLocation(WebGL.shaderProgram, "aVertexPosition");
        WebGL.gl.enableVertexAttribArray(WebGL.shaderProgram.vertexPositionAttribute);

        WebGL.shaderProgram.vertexNormalAttribute = WebGL.gl.getAttribLocation(WebGL.shaderProgram, "aVertexNormal");
        WebGL.gl.enableVertexAttribArray(WebGL.shaderProgram.vertexNormalAttribute);

        WebGL.shaderProgram.textureCoordAttribute = WebGL.gl.getAttribLocation(WebGL.shaderProgram, "aTextureCoord");
        WebGL.gl.enableVertexAttribArray(WebGL.shaderProgram.textureCoordAttribute);

        WebGL.shaderProgram.pMatrixUniform = WebGL.gl.getUniformLocation(WebGL.shaderProgram, "uPMatrix");
        WebGL.shaderProgram.mvMatrixUniform = WebGL.gl.getUniformLocation(WebGL.shaderProgram, "uMVMatrix");
        WebGL.shaderProgram.nMatrixUniform = WebGL.gl.getUniformLocation(WebGL.shaderProgram, "uNMatrix");
        WebGL.shaderProgram.samplerUniform = WebGL.gl.getUniformLocation(WebGL.shaderProgram, "uSampler");
        WebGL.shaderProgram.useLightingUniform = WebGL.gl.getUniformLocation(WebGL.shaderProgram, "uUseLighting");
        WebGL.shaderProgram.ambientColorUniform = WebGL.gl.getUniformLocation(WebGL.shaderProgram, "uAmbientColor");
        WebGL.shaderProgram.lightingDirectionUniform = WebGL.gl.getUniformLocation(WebGL.shaderProgram, "uLightingDirection");
        WebGL.shaderProgram.directionalColorUniform = WebGL.gl.getUniformLocation(WebGL.shaderProgram, "uDirectionalColor");
    },

    getShader: function(gl, id) {
        var shaderScript = document.getElementById(id);
        if (!shaderScript) {
            return null;
        }

        var str = "";
        var k = shaderScript.firstChild;
        while (k) {
            if (k.nodeType == 3) {
                str += k.textContent;
            }
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
            alert(gl.getShaderInfoLog(shader));
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
            -1.0,  1.0, -1.0
        ];
        WebGL.gl.bufferData(WebGL.gl.ARRAY_BUFFER, new Float32Array(vertices), WebGL.gl.STATIC_DRAW);
        WebGL.cubeVertexPositionBuffer.itemSize = 3;
        WebGL.cubeVertexPositionBuffer.numItems = 24;

        /**
         * Lightning
         */
        WebGL.cubeVertexNormalBuffer = WebGL.gl.createBuffer();
        WebGL.gl.bindBuffer(WebGL.gl.ARRAY_BUFFER, WebGL.cubeVertexNormalBuffer);
        var vertexNormals = [
            // Front face
            0.0,  0.0,  1.0,
            0.0,  0.0,  1.0,
            0.0,  0.0,  1.0,
            0.0,  0.0,  1.0,

            // Back face
            0.0,  0.0, -1.0,
            0.0,  0.0, -1.0,
            0.0,  0.0, -1.0,
            0.0,  0.0, -1.0,

            // Top face
            0.0,  1.0,  0.0,
            0.0,  1.0,  0.0,
            0.0,  1.0,  0.0,
            0.0,  1.0,  0.0,

            // Bottom face
            0.0, -1.0,  0.0,
            0.0, -1.0,  0.0,
            0.0, -1.0,  0.0,
            0.0, -1.0,  0.0,

            // Right face
            1.0,  0.0,  0.0,
            1.0,  0.0,  0.0,
            1.0,  0.0,  0.0,
            1.0,  0.0,  0.0,

            // Left face
            -1.0,  0.0,  0.0,
            -1.0,  0.0,  0.0,
            -1.0,  0.0,  0.0,
            -1.0,  0.0,  0.0
        ];

        WebGL.gl.bufferData(WebGL.gl.ARRAY_BUFFER, new Float32Array(vertexNormals), WebGL.gl.STATIC_DRAW);
        WebGL.cubeVertexNormalBuffer.itemSize = 3;
        WebGL.cubeVertexNormalBuffer.numItems = 24;

        // We apply the texture, we got the textureCoords which specufy a per-vertex combination of the x, y coordinates
        // of the vertex lies in the texture
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

        var normalMatrix = mat3.create();
        mat3.normalFromMat4(normalMatrix, WebGL.mvMatrix);
        WebGL.gl.uniformMatrix3fv(WebGL.shaderProgram.nMatrixUniform, false, normalMatrix);
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
    },

    handleKeyUp: function(event) {
        WebGL.currentlyPressedKeys[event.keyCode] = false;
    }
};