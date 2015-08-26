/*global $, Parse, window, document, console*/
$(function () {
    "use strict";
    var userGender, userHeight, userWeight;
    Parse.initialize("Cxe74rWpSEn9ywH1ryu1r3J7oMxSx0SLIrvmrFK1", "j2P6dfj3iSy9eyysKpoRKMIeuVde8lHxDK6upnGz");

    /**
     * Parse the height string
     * @param {string} str - the user input of height
     */
    function parseHeight(str) {
        var result, arr;
        //if str is in x'y" or x.y or x,y format
        if (/^(\d+)[.,'](\d+)$/.test(str)) {
            arr = str.split(/[.,']+/);
            result = parseInt(arr[0], 10) * 12 + parseInt(arr[1], 10);
        //if str is an integer
        } else if (/^\d+$/.test(str)) {
            result = parseFloat(parseFloat(str).toFixed(3));
            //looks like feet
            if (result < 8) {
                result = result * 12;
            }
        }
        return result;
    }

    /**
     * Detects the gender of the user
     * @param {float} h - the user input of height
     * @param {float} w - the user input of weight
     * @param {float} femaleRatio - average ratio of weight/height for all women in the samples database
     * @param {float} maleRatio - average ratio of weight/height for all men in the samples database
     */
    function detectGender(h, w, femaleRatio, maleRatio) {
        var userRatio = (w / h).toFixed(3);
        if (femaleRatio && maleRatio) {
            //find out if userRatio is closer to femaleRatio or maleRation
            if (Math.abs(userRatio - femaleRatio).toFixed(3) <= Math.abs(userRatio - maleRatio).toFixed(3)) {
                userGender = "female";
            } else if (Math.abs(userRatio - femaleRatio).toFixed(3) > Math.abs(userRatio - maleRatio).toFixed(3)) {
                userGender = "male";
            }
        }
        //show the result to the user
        if (userGender === 'female') {
            document.getElementById("gender").innerHTML = "A WOMAN!";
        } else if (userGender === 'male') {
            document.getElementById("gender").innerHTML = "A MAN!";
        }
    }

    /**
     * Find average ratio of weight/height for all women in the samples database
     */
    function findFemaleRatio() {
        var deferred = $.Deferred(), femaleRatio,
            FemaleSet = Parse.Object.extend("Sample"),
            femaleQuery = new Parse.Query(FemaleSet);
        femaleQuery.equalTo("gender", "female");
        femaleQuery.find({
            success: function (results) {
                var i, sum = 0, object;
                for (i = 0; i < results.length; i = i + 1) {
                    object = results[i];
                    sum = sum + (object.get('weight') / object.get('height'));
                }
                femaleRatio = (sum / results.length).toFixed(3);
                deferred.resolve(femaleRatio);
            },
            error: function (error) {
                console.log("Error: " + error.code + " " + error.message);
            }
        });
        return deferred;
    }

    /**
     * Find average ratio of weight/height for all men in the samples database
     */
    function findMaleRatio() {
        var deferred = $.Deferred(), maleRatio,
            MaleSet = Parse.Object.extend("Sample"),
            maleQuery = new Parse.Query(MaleSet);
        maleQuery.equalTo("gender", "male");
        maleQuery.find({
            success: function (results) {
                var i, sum = 0, object;
                for (i = 0; i < results.length; i = i + 1) {
                    object = results[i];
                    sum = sum + (object.get('weight') / object.get('height'));
                }
                maleRatio = (sum / results.length).toFixed(3);
                deferred.resolve(maleRatio);
            },
            error: function (error) {
                console.log("Error: " + error.code + " " + error.message);
            }
        });
        return deferred;
    }

    /**
     * Use jQuery promises to handle 2 async requests to the database and only proceed when both of them are done
     */
    function detectRatios() {
        var d1 = findFemaleRatio(),
            d2 = findMaleRatio();
        $.when(d1, d2).done(function (femaleRatio, maleRatio) {
            detectGender(userHeight, userWeight, femaleRatio, maleRatio);
        });
    }

    /**
     * Start listening for yes and no buttons' events
     */
    function startListening() {
        //activate event that allows to save the data to the database
        document.getElementById("yesButton").addEventListener('click', saveAfterRight);
        //activate event that allows to save the data to the database but make the userGender opposite
        document.getElementById("noButton").addEventListener('click', saveAfterWrong);
    }

    /**
     * Stop listening for yes and no buttons' events
     */
    function stopListening() {
        //desactivate event that allows to save the data to the database
        document.getElementById("yesButton").removeEventListener('click', saveAfterRight);
        //desactivate event that allows to save the data to the database but make the userGender opposite
        document.getElementById("noButton").removeEventListener('click', saveAfterWrong);
    }

    /**
     * Validate user input
     */
    function checkData() {
        document.getElementById("message").innerHTML = "";
        userHeight = document.getElementById("height").value;
        userWeight = document.getElementById("weight").value;
        if (/\S/.test(userWeight) && ((/^\d+$/.test(userWeight)) || (/^(\d+)[.,](\d+)$/.test(userWeight))) && parseHeight(userHeight)) {
            //validate that both strings contain valid symbols and convert height to number
            userHeight = parseHeight(userHeight);
            userWeight = parseFloat(parseFloat(userWeight).toFixed(3));
            document.getElementById("error").innerHTML = "";
            detectRatios();
            startListening();
        } else {
            document.getElementById("gender").innerHTML = '';
            document.getElementById("error").innerHTML = "Tell us your height and weight first";
            stopListening();
        }
    }

    /**
     * Save the user data to the database after the successful detection
     */
    function saveAfterRight() {
        if (userGender && userHeight && userWeight) {
            document.getElementById("message").innerHTML = "Yay!";
            var Sample = Parse.Object.extend("Sample"),
                sample  = new Sample({
                    gender: userGender,
                    height: parseFloat(userHeight),
                    weight: parseFloat(userWeight)
                });
            sample.save(null, {
                success: function () {
                    console.log("New sample saved");
                },
                error: function (error) {
                    console.log(error);
                }
            }).then(function () {
                userHeight = null;
                userWeight = null;
                document.getElementById("height").value = '';
                document.getElementById("weight").value = '';
                document.getElementById("gender").innerHTML = '';
            });
            stopListening();
        }
    }

    /**
     * Save the user data to the database after the unsuccessful detection
     */
    function saveAfterWrong() {
        var correctGender, sample,
            Sample = Parse.Object.extend("Sample");
        if (userGender && userHeight && userWeight) {
            document.getElementById("message").innerHTML = "Sorry! We'll be more accurate next time!";

            if (userGender === 'female') {
                correctGender = 'male';
            } else if (userGender === 'male') {
                correctGender = 'female';
            }
            sample  = new Sample({
                gender: correctGender,
                height: parseFloat(userHeight),
                weight: parseFloat(userWeight)
            });

            sample.save(null, {
                success: function () {
                    console.log("New sample saved");
                },
                error: function (error) {
                    console.log(error);
                }
            }).then(function () {
                userHeight = null;
                userWeight = null;
                document.getElementById("height").value = '';
                document.getElementById("weight").value = '';
                document.getElementById("gender").innerHTML = '';
            });
            stopListening();
        }
    }

    //listening for events
    document.getElementById("activateButton").addEventListener('click', checkData);

});