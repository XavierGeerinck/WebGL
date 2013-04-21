function WebGL(cid, fsid, vsid) {
    var canvas = document.getElementById(cid);
    if (!canvas.getContext("webgl") && !canvas.getContext("experimental-webgl"))
        alert("Your Browser Doesn't Support WebGL");
    else
    {
        this.gl = (canvas.getContext("webgl")) ? canvas.getContext("webgl") : canvas.getContext("experimental-webgl");
        this.gl.clearColor(1.0, 1.0, 1.0, 1.0); // This is the color
        this.gl.enable(this.gl.DEPTH_TEST); // Enable Depth Testing
        this.gl.depthFunc(this.gl.LEQUAL); // Set perspective View
        this.aspectRatio = canvas.width / canvas.height;

        // Load shaders here.
        /*
         Process the loading and the progressing of the shaders.
         1) Check if they exist.
         2) Load them 1 by one
         3) Compile them and attach them to the central shader program
         4) Link the 2 shaders together
         5) Store them for later use

         Note: Texture should have byte sizes: 2x2 4x4, 16x16, 32x32
         */
        var fShader = document.getElementById(fsid);
        var vShader = document.getElementById(vsid);

        if (!fShader || !vShader)
            alert("Error, Could Not Find Shaders");
        else
        {
            // Load and Compile the Fragment Shader
            var code = loadShader(fShader);
            fShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
            this.gl.shaderSource(fShader, code);
            this.gl.compileShader(fShader);

            // Load and Compile the Vertex Shader
            code = loadShader(vShader);
            vShader = this.gl.createShader(this.gl.VERTEX_SHADER);
            this.gl.shaderSource(vShader, code);
            this.gl.compileShader(vShader);

            // Create the Shader program
            this.shaderProgram = this.gl.createProgram();
            this.gl.attachShader(this.shaderProgram, fShader);
            this.gl.attachShader(this.shaderProgram, vShader);
            this.gl.linkProgram(this.shaderProgram);
            this.gl.useProgram(this.shaderProgram);

            // Link Vertex position attribute from shader
            this.vertexPosition = this.gl.getAttribLocation(this.shaderProgram, "VertexPosition");
            this.gl.enableVertexAttribArray(this.vertexPosition);

            // Link Texture Coordinate Attribute from Shader
            this.vertexTexture = this.gl.getAttribLocation(this.shaderProgram, "TextureCoord");
            this.gl.enableVertexAttribArray(this.vertexTexture);
        }

        this.draw = function (model) {
            if (model.image.readyState == true && model.ready == false) {
                this.prepareModel(model);
            }

            if (model.ready) {
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, model.vertices);
                this.gl.vertexAttribPointer(this.vertexPosition, 3, this.gl.FLOAT, false, 0, 0);
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, model.textureMap);
                this.gl.vertexAttribPointer(this.vertexTexture, 2, this.gl.FLOAT, false, 0, 0);

                this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, model.triangles);

                //Generate The Perspective Matrix
                var perspectiveMatrix = makePerspective(45, this.aspectRatio, 1, 1000.0);

                var transformMatrix = model.getTransforms();
                //Set slot 0 as the active Texture
                this.gl.activeTexture(this.gl.TEXTURE0);

                //Load in the Texture To Memory
                this.gl.bindTexture(this.gl.TEXTURE_2D, model.Image);

                //Update The Texture Sampler in the fragment shader to use slot 0
                this.gl.uniform1i(this.gl.getUniformLocation(this.shaderProgram, "uSampler"), 0);

                //Set The Perspective and Transformation Matrices
                var pmatrix = this.gl.getUniformLocation(this.shaderProgram, "PerspectiveMatrix");
                this.gl.uniformMatrix4fv(pmatrix, false, new Float32Array(perspectiveMatrix));

                var tmatrix = this.gl.getUniformLocation(this.shaderProgram, "TransformationMatrix");
                this.gl.uniformMatrix4fv(tmatrix, false, new Float32Array(transformMatrix));

                //draw The Triangles
                this.gl.drawElements(this.gl.TRIANGLES, model.triangleCount, this.gl.UNSIGNED_SHORT, 0);
            }
        };

        this.prepareModel = function (model) {
            model.image = this.loadTexture(model.image);

            //Convert Arrays to buffers
            var buffer = this.gl.createBuffer();

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(model.vertices), this.gl.STATIC_DRAW);
            model.vertices = buffer;

            buffer = this.gl.createBuffer();

            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffer);
            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(model.triangles), this.gl.STATIC_DRAW);
            model.triangles = buffer;

            buffer = this.gl.createBuffer();

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(model.textureMap), this.gl.STATIC_DRAW);
            model.textureMap = buffer;

            model.ready = true;
        };

        /*
         Convert image into WebGL texture
         This function will take care of converting the image

         Note: Image have to be in byte dimensiones: 2x2, 4x4, 8x8, 16x16, 32x32, 64x64, ...
         The Y coordinates flipping is added because sometimes you got the Y at the top left, and sometimes at the bottom left.
         The scaling will just tell WebGL how to scale up and down.
         */
        this.loadTexture = function(img){
            //Create a new Texture and Assign it as the active one
            var tempTex = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, tempTex);
            this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
            //Load in The Image
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, img);

            //Setup Scaling properties
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_NEAREST);
            this.gl.generateMipmap(this.gl.TEXTURE_2D);

            //Unbind the texture and return it.
            this.gl.bindTexture(this.gl.TEXTURE_2D, null);

            return tempTex;
        };
    }
}

/*
 For every child in the given Script loop through them and check if it's a text node, if it is then append that to the Code.
 */
function loadShader(script) {
    var code = "";
    var currentChild = script.firstChild;
    while (currentChild)
    {
        if (currentChild.nodeType == currentChild.TEXT_NODE)
            code += currentChild.textContent;

        currentChild = currentChild.nextSibling;
    }

    return code;
};

/*
 The perspective matrix will edit the 3D world like the field of view and the visible objects

 Accepts the vertical field of view, the aspect ratio and the nearest and furthest points as arguments
 Anything closer than 1 unit and further then 10000 units will not be displayed.
 */
function makePerspective(fov, aspectRatio, closest, furthest) {
    var yLimit = closest * Math.tan(fov * Math.PI / 360);
    var a = -( furthest + closest ) / ( furthest - closest );
    var b = -2 * furthest * closest / ( furthest - closest );
    var c = (2 * closest) / ( (yLimit * aspectRatio) * 2 );
    var d = (2 * closest) / ( yLimit * 2 );

    return [
        c, 0, 0, 0,
        0, d, 0, 0,
        0, 0, a, -1,
        0, 0, b, 0
    ];
};

/*
 The transform matrix will edit the individual objects like the rotation, scale and position.
 */
function makeTransform(object){
    var y = object.rotation * (Math.PI / 180.0);
    var a = Math.cos(y);
    var b = -1 * Math.sin(y);
    var c = Math.sin(y);
    var d = Math.cos(y);
    object.rotation += .3;
    return [
        a, 0, b, 0,
        0, 1, 0, 0,
        c, 0, d, 0,
        0, 0, -6, 1
    ];
};

function mh(a, b) {
    var sum = 0;
    for (var i = 0; i < a.length; i++) {
        sum += a[i] * b[i];
    }
    return sum;
}

function multiplyMatrix(a, b) {
    var a1 = [a[0], a[1], a[2], a[3]];
    var a2 = [a[4], a[5], a[6], a[7]];
    var a3 = [a[8], a[9], a[10], a[11]];
    var a4 = [a[12], a[13], a[14], a[15]];

    var b1 = [b[0], b[4], b[8], b[12]];
    var b2 = [b[1], b[5], b[9], b[13]];
    var b3 = [b[2], b[6], b[10], b[14]];
    var b4 = [b[3], b[7], b[11], b[15]];

    return [
        mh(a1, b1), mh(a1, b2), mh(a1, b3), mh(a1, b4),
        mh(a2, b1), mh(a2, b2), mh(a2, b3), mh(a2, b4),
        mh(a3, b1), mh(a3, b2), mh(a3, b3), mh(a3, b4),
        mh(a4, b1), mh(a4, b2), mh(a4, b3), mh(a4, b4)];
}