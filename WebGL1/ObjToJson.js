function Model(vertexArr, triangleArr, textureArr, imageSrc) {
    this.pos = {
        x: 0,
        y: 0,
        z: 0
    };
    this.scale = {
        x: 1.0,
        y: 1.0,
        z: 1.0
    };
    this.rotation = {
        x: 0,
        y: 0,
        z: 0
    };
    this.vertices = vertexArr;
    this.triangles = triangleArr;
    this.triangleCount = triangleArr.length;
    this.textureMap = textureArr;
    this.image = new Image();
    this.image.onload = function () {
        this.readyState = true;
    };
    this.image.src = imageSrc;
    this.ready = false;

    this.getTransforms = function () {
        //Create a Blank Identity Matrix
        var TMatrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

        //Scaling
        var Temp = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
        Temp[0] *= this.scale.x;
        Temp[5] *= this.scale.y;
        Temp[10] *= this.scale.z;
        TMatrix = MultiplyMatrix(TMatrix, Temp);

        //Rotating X
        Temp = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
        var x = this.rotation.X * (Math.PI / 180.0);
        Temp[5] = Math.cos(x);
        Temp[6] = Math.sin(x);
        Temp[9] = -1 * Math.sin(x);
        Temp[10] = Math.cos(x);
        TMatrix = MultiplyMatrix(TMatrix, Temp);
        //Rotating Y
        Temp = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
        var y = this.rotation.y * (Math.PI / 180.0);
        Temp[0] = Math.cos(y);
        Temp[2] = -1 * Math.sin(y);
        Temp[8] = Math.sin(y);
        Temp[10] = Math.cos(y);
        TMatrix = MultiplyMatrix(TMatrix, Temp);

        //Rotating Z
        Temp = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
        var z = this.rotation.z * (Math.PI / 180.0);
        Temp[0] = Math.cos(z);
        Temp[1] = Math.sin(z);
        Temp[4] = -1 * Math.sin(z);
        Temp[5] = Math.cos(z);
        TMatrix = MultiplyMatrix(TMatrix, Temp);
        //Moving
        Temp = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
        Temp[12] = this.pos.x;
        Temp[13] = this.pos.y;
        Temp[14] = this.pos.z * -1;

        return MultiplyMatrix(TMatrix, Temp);
    }
}

function getFile(url, callback) {
    // http://www.html5rocks.com/en/tutorials/file/xhr2/
    var xhr = new XMLHttpRequest();

    xhr.responseType = 'text';
    xhr.open('GET', url, true);

    xhr.onload = function() {
        // http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html
        // Status 200 == OK
        if (this.status == 200) {
            callback(parseResponse(this.response));
        }
    };

    xhr.send();
}

function parseResponse(response) {
    // Todo, check normal json and obj
    return parseObject(response);
}

/*
 * This function takes a url as parameter, and then checks the file if it is a .obj file.
 * Loading is done through ajax!
 *
 * According to wikipedia: http://en.wikipedia.org/wiki/Wavefront_.obj_file
 * v = List of vertices (x, y, z [,w])
 * vt = texture coordinates (u, v [,w])
 * vn = Normals (x, y, z)
 * vp = Parameter space vertices (u [,v] [,w])
 * f = face definitions
 */
function parseObject(object) {
    if (!object) {
        console.log("No object received");
        return;
    }

    var json = [];

    var receivedObject = object.split("\n");

    var vertices = [];
    var verticeMap = [];

    var triangles = [];

    var textures = [];
    var textureMap = [];

    var normals = [];
    var normalMap = [];

    var parameterSpaces = [];
    var parameterSpaceMap = [];

    var triangleCounter = 0;

    for (var i in receivedObject) {
        var line = receivedObject[i];
        var lineType = line.substring(0, 2); // Do this here already, else if we got a vn it needs to execute this 3 times.

        switch (lineType) {
            case "v ":
                // v = List of vertices (x, y, z [,w])
                var values = line.substring(2).split(" ");

                vertices.push({
                    x: parseFloat(values[0]),
                    y: parseFloat(values[1]),
                    z: parseFloat(values[2])
                });
                break;
            // vt = texture coordinates (u, v [,w])
            case "vt":
                var values = line.substring(3).split(" ");

                textures.push({
                    y: parseFloat(values[0]),
                    v: parseFloat(values[1])
                });
                break;
            // vn = Normals (x, y, z)
            case "vn":
                var values = line.substring(3).split(" ");

                normals.push({
                    x: parseFloat(values[0]),
                    y: parseFloat(values[1]),
                    z: parseFloat(values[2])
                });
                break;
            // vp = Parameter space vertices (u [,v] [,w])
            case "vp":
                var values = line.substring(3).split(" ");

                parameterSpaces.push({
                    u: parseFloat(values[0])
                });
                break;
            // f = face definitions
            case "f ":
                var values = line.substring(2).split(" ");

                for (var triangle in values) {
                    // No blank entries
                    if (values[triangle] != "") {
                        // multi value array?
                        if (values[triangle].indexOf("/") != -1) {
                            // Split different values
                            var triangleC = values[triangle].split("/");

                            // Add triangle to our array, NOTE: We increment after this, so we start on place 0 in the array
                            triangles.push(triangleCounter);

                            // We found a triangle :D increment counter!
                            triangleCounter++;

                            // Insert the vertices
                            var index = parseInt(triangleC[0]) - 1;
                            verticeMap.push(vertices[index].x);
                            verticeMap.push(vertices[index].y);
                            verticeMap.push(vertices[index].z);

                            // Insert the textures
                            var index = parseInt(triangleC[1]) - 1;
                            textureMap.push(textures[index].X);
                            textureMap.push(textures[index].Y);

                            // If has normals data
                            if (triangleC.length > 2) {
                                // Insert normals
                                index = parseInt(triangleC[2]) - 1;
                                normalMap.push(normals[index].x);
                                normalMap.push(normals[index].y);
                                normalMap.push(normals[index].z);
                            }
                        // If we only got vertices
                        } else {
                            triangles.push(triangleCounter);
                            triangleCounter++;
                            var index = parseInt(values[triangle]) - 1;
                            verticeMap.push(vertices[index].x);
                            verticeMap.push(vertices[index].y);
                            verticeMap.push(vertices[index].z);
                        }
                    }
                }
                break;
        }
    }

    json.push({
        "vertices": vertices,
        "triangles": triangles,
        "textures": textures,
        "normals": normals,
        "verticeMap": verticeMap,
        "textureMap": textureMap,
        "normalMap": normalMap
    });

    return json;
/*
    var Cube = {
        Rotation: 0,
        Vertices : [ // X, Y, Z Coordinates

            //Front

            1.0,  1.0,  -1.0,
            1.0, -1.0,  -1.0,
            -1.0,  1.0,  -1.0,
            -1.0, -1.0,  -1.0,

            //Back

            1.0,  1.0,  1.0,
            1.0, -1.0,  1.0,
            -1.0,  1.0,  1.0,
            -1.0, -1.0,  1.0,

            //Right

            1.0,  1.0,  1.0,
            1.0, -1.0,  1.0,
            1.0,  1.0, -1.0,
            1.0, -1.0, -1.0,

            //Left

            -1.0,  1.0,  1.0,
            -1.0, -1.0,  1.0,
            -1.0,  1.0, -1.0,
            -1.0, -1.0, -1.0,

            //Top

            1.0,  1.0,  1.0,
            -1.0, -1.0,  1.0,
            1.0, -1.0, -1.0,
            -1.0, -1.0, -1.0,

            //Bottom

            1.0, -1.0,  1.0,
            -1.0, -1.0,  1.0,
            1.0, -1.0, -1.0,
            -1.0, -1.0, -1.0

        ],
        Triangles : [ // Also in groups of threes to define the three points of each triangle
            //The numbers here are the index numbers in the vertex array

            //Front

            0, 1, 2,
            1, 2, 3,

            //Back

            4, 5, 6,
            5, 6, 7,

            //Right

            8, 9, 10,
            9, 10, 11,

            //Left

            12, 13, 14,
            13, 14, 15,

            //Top

            16, 17, 18,
            17, 18, 19,

            //Bottom

            20, 21, 22,
            21, 22, 23

        ],
        Texture : [ //This array is in groups of two, the x and y coordinates (a.k.a U,V) in the texture
            //The numbers go from 0.0 to 1.0, One pair for each vertex

            //Front

            1.0, 1.0,
            1.0, 0.0,
            0.0, 1.0,
            0.0, 0.0,


            //Back

            0.0, 1.0,
            0.0, 0.0,
            1.0, 1.0,
            1.0, 0.0,

            //Right

            1.0, 1.0,
            1.0, 0.0,
            0.0, 1.0,
            0.0, 0.0,

            //Left

            0.0, 1.0,
            0.0, 0.0,
            1.0, 1.0,
            1.0, 0.0,

            //Top

            1.0, 0.0,
            1.0, 1.0,
            0.0, 0.0,
            0.0, 1.0,

            //Bottom

            0.0, 0.0,
            0.0, 1.0,
            1.0, 0.0,
            1.0, 1.0
        ]
    };

    //return Cube;

    return JSON.stringify(json);*/
}