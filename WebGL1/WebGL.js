function WebGL(CID, FSID, VSID) {
    var canvas = document.getElementById(CID);
    if (!canvas.getContext("webgl") && !canvas.getContext("experimental-webgl"))
        alert("Your Browser Doesn't Support WebGL");
    else
    {
        this.GL = (canvas.getContext("webgl")) ? canvas.getContext("webgl") : canvas.getContext("experimental-webgl");
        this.GL.clearColor(1.0, 1.0, 1.0, 1.0); // This is the color
        this.GL.enable(this.GL.DEPTH_TEST); // Enable Depth Testing
        this.GL.depthFunc(this.GL.LEQUAL); // Set perspective View
        this.AspectRatio = canvas.width / canvas.height;

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
        var FShader = document.getElementById(FSID);
        var VShader = document.getElementById(VSID);

        if (!FShader || !VShader)
            alert("Error, Could Not Find Shaders");
        else
        {
            // Load and Compile the Fragment Shader
            var Code = LoadShader(FShader);
            FShader = this.GL.createShader(this.GL.FRAGMENT_SHADER);
            this.GL.shaderSource(FShader, Code);
            this.GL.compileShader(FShader);

            // Load and Compile the Vertex Shader
            Code = LoadShader(VShader);
            VShader = this.GL.createShader(this.GL.VERTEX_SHADER);
            this.GL.shaderSource(VShader, Code);
            this.GL.compileShader(VShader);

            // Create the Shader program
            this.ShaderProgram = this.GL.createProgram();
            this.GL.attachShader(this.ShaderProgram, FShader);
            this.GL.attachShader(this.ShaderProgram, VShader);
            this.GL.linkProgram(this.ShaderProgram);
            this.GL.useProgram(this.ShaderProgram);

            // Link Vertex position attribute from shader
            this.VertexPosition = this.GL.getAttribLocation(this.ShaderProgram, "VertexPosition");
            this.GL.enableVertexAttribArray(this.VertexPosition);

            // Link Texture Coordinate Attribute from Shader
            this.VertexTexture = this.GL.getAttribLocation(this.ShaderProgram, "TextureCoord");
            this.GL.enableVertexAttribArray(this.VertexTexture);
        }

        this.Draw = function (model) {
            if (model.image.readyState == true && model.ready == false) {
                this.PrepareModel(model);
            }
            if (model.ready) {
                this.GL.bindBuffer(this.GL.ARRAY_BUFFER, model.vertices);
                this.GL.vertexAttribPointer(this.VertexPosition, 3, this.GL.FLOAT, false, 0, 0);
                this.GL.bindBuffer(this.GL.ARRAY_BUFFER, model.textureMap);
                this.GL.vertexAttribPointer(this.VertexTexture, 2, this.GL.FLOAT, false, 0, 0);

                this.GL.bindBuffer(this.GL.ELEMENT_ARRAY_BUFFER, model.triangles);

                //Generate The Perspective Matrix
                var PerspectiveMatrix = MakePerspective(45, this.AspectRatio, 1, 1000.0);

                var TransformMatrix = model.getTransforms();
                //Set slot 0 as the active Texture
                this.GL.activeTexture(this.GL.TEXTURE0);

                //Load in the Texture To Memory
                this.GL.bindTexture(this.GL.TEXTURE_2D, model.Image);

                //Update The Texture Sampler in the fragment shader to use slot 0
                this.GL.uniform1i(this.GL.getUniformLocation(this.ShaderProgram, "uSampler"), 0);

                //Set The Perspective and Transformation Matrices
                var pmatrix = this.GL.getUniformLocation(this.ShaderProgram, "PerspectiveMatrix");
                this.GL.uniformMatrix4fv(pmatrix, false, new Float32Array(PerspectiveMatrix));

                var tmatrix = this.GL.getUniformLocation(this.ShaderProgram, "TransformationMatrix");
                this.GL.uniformMatrix4fv(tmatrix, false, new Float32Array(TransformMatrix));

                //Draw The Triangles
                this.GL.drawElements(this.GL.TRIANGLES, model.triangleCount, this.GL.UNSIGNED_SHORT, 0);
            }
        };

        this.PrepareModel = function (model) {
            model.image = this.LoadTexture(model.image);

            //Convert Arrays to buffers
            var buffer = this.GL.createBuffer();

            this.GL.bindBuffer(this.GL.ARRAY_BUFFER, buffer);
            this.GL.bufferData(this.GL.ARRAY_BUFFER, new Float32Array(model.vertices), this.GL.STATIC_DRAW);
            model.vertices = buffer;

            buffer = this.GL.createBuffer();

            this.GL.bindBuffer(this.GL.ELEMENT_ARRAY_BUFFER, buffer);
            this.GL.bufferData(this.GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(model.triangles), this.GL.STATIC_DRAW);
            model.triangles = buffer;

            buffer = this.GL.createBuffer();

            this.GL.bindBuffer(this.GL.ARRAY_BUFFER, buffer);
            this.GL.bufferData(this.GL.ARRAY_BUFFER, new Float32Array(model.textureMap), this.GL.STATIC_DRAW);
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
        this.LoadTexture = function(Img){
            //Create a new Texture and Assign it as the active one
            var TempTex = this.GL.createTexture();
            this.GL.bindTexture(this.GL.TEXTURE_2D, TempTex);
            this.GL.pixelStorei(this.GL.UNPACK_FLIP_Y_WEBGL, true);
            //Load in The Image
            this.GL.texImage2D(this.GL.TEXTURE_2D, 0, this.GL.RGBA, this.GL.RGBA, this.GL.UNSIGNED_BYTE, Img);

            //Setup Scaling properties
            this.GL.texParameteri(this.GL.TEXTURE_2D, this.GL.TEXTURE_MAG_FILTER, this.GL.LINEAR);
            this.GL.texParameteri(this.GL.TEXTURE_2D, this.GL.TEXTURE_MIN_FILTER, this.GL.LINEAR_MIPMAP_NEAREST);
            this.GL.generateMipmap(this.GL.TEXTURE_2D);

            //Unbind the texture and return it.
            this.GL.bindTexture(this.GL.TEXTURE_2D, null);
            return TempTex;
        };

        this.getTransforms = function () {
            //Create a Blank Identity Matrix
            var TMatrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

            //Scaling
            var Temp = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
            Temp[0] *= this.Scale.X;
            Temp[5] *= this.Scale.Y;
            Temp[10] *= this.Scale.Z;
            TMatrix = MultiplyMatrix(TMatrix, Temp);

            //Rotating X
            Temp = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
            var X = this.Rotation.X * (Math.PI / 180.0);
            Temp[5] = Math.cos(X);
            Temp[6] = Math.sin(X);
            Temp[9] = -1 * Math.sin(X);
            Temp[10] = Math.cos(X);
            TMatrix = MultiplyMatrix(TMatrix, Temp);
            //Rotating Y
            Temp = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
            var Y = this.Rotation.Y * (Math.PI / 180.0);
            Temp[0] = Math.cos(Y);
            Temp[2] = -1 * Math.sin(Y);
            Temp[8] = Math.sin(Y);
            Temp[10] = Math.cos(Y);
            TMatrix = MultiplyMatrix(TMatrix, Temp);

            //Rotating Z
            Temp = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
            var Z = this.Rotation.Z * (Math.PI / 180.0);
            Temp[0] = Math.cos(Z);
            Temp[1] = Math.sin(Z);
            Temp[4] = -1 * Math.sin(Z);
            Temp[5] = Math.cos(Z);
            TMatrix = MultiplyMatrix(TMatrix, Temp);
            //Moving
            Temp = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
            Temp[12] = this.Pos.X;
            Temp[13] = this.Pos.Y;
            Temp[14] = this.Pos.Z * -1;

            return MultiplyMatrix(TMatrix, Temp);
        }
    }
}

/*
 For every child in the given Script loop through them and check if it's a text node, if it is then append that to the Code.
 */
LoadShader = function(Script) {
    var Code = "";
    var CurrentChild = Script.firstChild;
    while (CurrentChild)
    {
        if (CurrentChild.nodeType == CurrentChild.TEXT_NODE)
            Code += CurrentChild.textContent;

        CurrentChild = CurrentChild.nextSibling;
    }

    return Code;
};

/*
 The perspective matrix will edit the 3D world like the field of view and the visible objects

 Accepts the vertical field of view, the aspect ratio and the nearest and furthest points as arguments
 Anything closer than 1 unit and further then 10000 units will not be displayed.
 */
MakePerspective = function(FOV, AspectRatio, Closest, Farest) {
    var YLimit = Closest * Math.tan(FOV * Math.PI / 360);
    var A = -( Farest + Closest ) / ( Farest - Closest );
    var B = -2 * Farest * Closest / ( Farest - Closest );
    var C = (2 * Closest) / ( (YLimit * AspectRatio) * 2 );
    var D = (2 * Closest) / ( YLimit * 2 );

    return [
        C, 0, 0, 0,
        0, D, 0, 0,
        0, 0, A, -1,
        0, 0, B, 0
    ];
};

/*
 The transform matrix will edit the individual objects like the rotation, scale and position.
 */
MakeTransform = function(Object){
    var y = Object.Rotation * (Math.PI / 180.0);
    var A = Math.cos(y);
    var B = -1 * Math.sin(y);
    var C = Math.sin(y);
    var D = Math.cos(y);
    Object.Rotation += .3;
    return [
        A, 0, B, 0,
        0, 1, 0, 0,
        C, 0, D, 0,
        0, 0, -6, 1
    ];
};

function MH(A, B) {
    var Sum = 0;
    for (var i = 0; i < A.length; i++) {
        Sum += A[i] * B[i];
    }
    return Sum;
}

function MultiplyMatrix(A, B) {
    var A1 = [A[0], A[1], A[2], A[3]];
    var A2 = [A[4], A[5], A[6], A[7]];
    var A3 = [A[8], A[9], A[10], A[11]];
    var A4 = [A[12], A[13], A[14], A[15]];

    var B1 = [B[0], B[4], B[8], B[12]];
    var B2 = [B[1], B[5], B[9], B[13]];
    var B3 = [B[2], B[6], B[10], B[14]];
    var B4 = [B[3], B[7], B[11], B[15]];

    return [
        MH(A1, B1), MH(A1, B2), MH(A1, B3), MH(A1, B4),
        MH(A2, B1), MH(A2, B2), MH(A2, B3), MH(A2, B4),
        MH(A3, B1), MH(A3, B2), MH(A3, B3), MH(A3, B4),
        MH(A4, B1), MH(A4, B2), MH(A4, B3), MH(A4, B4)];
}