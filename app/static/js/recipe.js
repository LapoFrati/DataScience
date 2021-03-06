// Google Maps Variables
var geocoder;
var map;
var placesService;
var infoWindow;

// Array to keep track of map markers
var markersArray = [];

// four square api variables
var fourSquareKey = 'LECWBWPT1G4HKYS2UMOIG0TVROVLEODL2AIYH1SYK4ZOZSCM';
var fourSquareId = 'GEYHVEZTATSETIP3J4ZDFIHTQWIPPKLPRV0VQUF1P23L1JJ2';

var restaurantIds = {};
restaurantIds['irish'] = '52e81612bcbc57f1066b7a06';
restaurantIds['mexican'] = '4bf58dd8d48988d1c1941735';
restaurantIds['chinese'] = '4bf58dd8d48988d145941735';
restaurantIds['japanese'] = '4bf58dd8d48988d111941735';
restaurantIds['moroccan'] = '4bf58dd8d48988d1c3941735';
restaurantIds['french'] = '4bf58dd8d48988d10c941735';
restaurantIds['spanish'] = '4bf58dd8d48988d150941735';
restaurantIds['russian'] = '5293a7563cf9994f4e043a44';
restaurantIds['thai'] = '4bf58dd8d48988d149941735';
restaurantIds['southern_us'] = '4bf58dd8d48988d14f941735';
restaurantIds['filipino'] = '4eb1bd1c3b7b55596b4a748f';
restaurantIds['vietnamese'] = '4eb1bd1c3b7b55596b4a748f';
restaurantIds['british'] = '52e81612bcbc57f1066b7a05';
restaurantIds['greek'] = '4bf58dd8d48988d10e941735';
restaurantIds['indian'] = '4bf58dd8d48988d10f941735';
restaurantIds['jamaican'] = '4bf58dd8d48988d144941735';
restaurantIds['brazilian'] = '4bf58dd8d48988d16b941735';
restaurantIds['cajun_creole'] = '4bf58dd8d48988d17a941735';
restaurantIds['korean'] = '4bf58dd8d48988d113941735';
restaurantIds['italian'] = '4bf58dd8d48988d110941735';

(function ($) {
    "use strict"; // Start of use strict

    // jQuery for page scrolling feature - requires jQuery Easing plugin
    $('a.page-scroll').bind('click', function (event) {
        var $anchor = $(this);
        $('html, body').stop().animate({
            scrollTop: ($($anchor.attr('href')).offset().top - 50)
        }, 1250, 'easeInOutExpo');
        event.preventDefault();
    });

    // Highlight the top nav as scrolling occurs
    $('body').scrollspy({
        target: '.navbar-fixed-top',
        offset: 51
    });

    // Closes the Responsive Menu on Menu Item Click
    $('.navbar-collapse ul li a').click(function () {
        $('.navbar-toggle:visible').click();
    });

    // Offset for Main Navigation
    $('#mainNav').affix({
        offset: {
            top: 100
        }
    });

    $('.list-group-item').hover();

    /* When ajax requests are being processed, display loading spinner to user */
    $(document).ajaxStart(function () {
        $('#tell-me-more').append(' <i id="spinner" class="fa fa-spinner fa-spin"></i>');
    });

    /* When finished scroll to recipes */
    $(document).ajaxStop(function () {
        var $anchor = $('#tell-me-more');
        $anchor.attr('href', '#healthy-recipes');
        $('html, body').stop().animate({

            scrollTop: ($($anchor.attr('href')).offset().top - 50)
        }, 1250, 'easeInOutExpo');
        event.preventDefault();
        $anchor.removeAttr('href');
        $('#spinner').remove();
    });

})(jQuery); // End of use strict

/**
 * Initialize google map variables
 */
function initMap() {

    /* Map Setup - Initial map is the UK */
    var latlng = new google.maps.LatLng(53.181957, -3.876466);
    var mapOptions = {
        zoom: 6,
        center: latlng
    };

    /* Initialize Google Services */
    map = new google.maps.Map(document.getElementById('map'), mapOptions);
    geocoder = new google.maps.Geocoder();
    placesService = new google.maps.places.PlacesService(map);
    infoWindow = new google.maps.InfoWindow();
}

/**
 * Convert the location the user entered into coordinates to search restaurants using Google Places.
 */
function findLocation() {

    /* Get information user entered */
    var location = document.getElementById("location-entry").value;
    var recipe = document.getElementById("recipe-entry").value;

    /* Get healthy recipe information from server */
    $.ajax({
        type: 'POST',
        url: '/recipe',
        data: {recipe_name: recipe},
        success: function (data) {
            addRecipes(data);
        }
    });

    var ll = null;

    /* Convert location into coordinates and retrieve restaurants */
    geocoder.geocode({'address': location}, function (results, status) {
        if (status == 'OK') {

            var latitude = results[0].geometry.location.lat();
            var longitude = results[0].geometry.location.lng();
            var latlng = {lat: latitude, lng: longitude};
            ll = latitude.toFixed(2) + ',' + longitude.toFixed(2);

            /* Clear the previous markers */
            clearMarkers();

            /* Create the marker */
            var marker = new google.maps.Marker({
                map: map,
                position: latlng
            });

            // Set the default red Icon
            marker.setIcon('http://maps.google.com/mapfiles/ms/icons/blue-dot.png');

            // Push marker to array
            markersArray.push(marker);

            // Marker listener
            marker.addListener('click', function () {
                infoWindow.setContent('You');
                infoWindow.open(map, marker);
            });

            // Determine cuisine for recipe
            $.ajax({
                type: 'POST',
                url: '/cuisine',
                data: {recipe_name: recipe},
                success: function (data) {
                    findRestaurants(ll, determineCuisines(data));
                }
            });

        } else {

            $("#error-title").text("Error");
            $("#error-body").text('Geocode was not successful for the following reason: ' + status);
            $('#modal-error').modal('show')
        }
    });
}

/**
 * Determine which restaurants to search by cuisine
 *
 * @param recipe JSON containing cuisine percentages
 * @returns {string} Restaurant categories from fourspace
 */
function determineCuisines(recipe) {
    var cuisines = "";

    /* Determine which cuisines to show */
    for (var i in recipe) {

        var cuisine = recipe[i].cuisine;
        var value = recipe[i].value;

        if (value >= 150)
            cuisines = cuisines + restaurantIds[cuisine] + ",";
    }

    cuisines = cuisines.slice(0, -1);
    return cuisines;
}

function findRestaurants(location, cuisine) {
    /* Rest request to get restaurant information based on user's query */
    $.ajax({
        type: 'get',
        url: 'https://api.foursquare.com/v2/venues/search',
        data: {
            client_id: fourSquareKey, client_secret: fourSquareId, ll: location,
            v: '20161130', categoryId: cuisine, intent: 'browse',
            radius: 3000
        },
        success: function (data) {

            /* Place markers on the map */
            var venues = data.response.venues;
            for (var i = 0; i < venues.length; i++)
                createMarker(venues[i]);

            /* Set the map boundaries */
            var bounds = new google.maps.LatLngBounds();
            for (i = 0; i < markersArray.length; i++) {
                bounds.extend(markersArray[i].getPosition());
            }
            map.fitBounds(bounds);
            map.setCenter(bounds.getCenter());
        },
        error: function (xhr) {
            console.log(xhr.status + ": " + xhr.responseText);
            $("#error-title").text("Error");
            $("#error-body").text('Restaurant search was not successful for the following reason: ' + xhr.status);
            $('#modal-error').modal('show')
        }
    });
}

/**
 * Place a marker on the map with restaurant name
 * @param place Place object from Google Places
 */
function createMarker(place) {

    /* Create the marker */
    var latlng = {lat: place.location.lat, lng: place.location.lng};
    var marker = new google.maps.Marker({
        map: map,
        position: latlng
    });

    // Set the default red Icon
    marker.setIcon('http://maps.google.com/mapfiles/ms/icons/red-dot.png');

    // Push marker to array
    markersArray.push(marker);

    /* Marker listener */
    marker.addListener('click', function () {
        infoWindow.setContent(place.name);
        infoWindow.open(map, marker);
    });

    /* Add restaurant information to list beside map */
    addToList(place, marker);
}

/**
 * Add restaurant information to list beside the map
 * @param place Restaurant object
 * @param marker Google Maps Marker
 */
function addToList(place, marker) {

    /* Restaurant information */
    var name = place.name;
    var id = place.id;
    var phone = place['contact'].formattedPhone;
    var url = String(place.url);
    var fullUrl = url;
    var formattedAddress = place['location'].formattedAddress;

    /* Don't display information if it doesn't exists */
    if (phone === undefined)
        phone = '';

    /* Remove http:// from url */
    if (url === 'undefined')
        url = '';
    else
        url = url.substring(7);

    /* Create address string */
    var address = "";
    for (var i = 0; i < formattedAddress.length - 1; i++)
        address = address + formattedAddress[i] + ", ";

    /* Remove last comma and space from address */
    address = address.substring(0, address.length - 2);

    $('.list-group').append('<div><button class="list-group-item list-group-item-action restaurant-list" id="' + id + '"><h4>' + name
        + '</h4><p class="restaurant-info">' + address + '</p><p class="restaurant-info">' + url + '</p><p class="restaurant-info">' + phone + '</p></button></div>');

    /* Open url with restaurant section */
    if (url !== '') {
        $('#' + id).bind('click', function () {
            window.open(fullUrl, '_blank');
        });
    }

    $('#' + id).hover(function () {
        marker.setIcon('http://maps.google.com/mapfiles/ms/icons/green-dot.png')
    }, function () {
        marker.setIcon('http://maps.google.com/mapfiles/ms/icons/red-dot.png')
    });
}

String.prototype.capitalize = function () {
    return this.charAt(0).toUpperCase() + this.slice(1);
};

/**
 * Remove all markers from the map and clear the list of restaurants
 */
function clearMarkers() {

    // Remove markers from the map
    for (var i = 0; i < markersArray.length; i++) {
        markersArray[i].setMap(null);
    }

    // Reset the markers array
    markersArray.length = 0;

    // Reset the restaurant list
    $('.list-group').html('');
}

function addRecipes(recipes) {

    /* Remove previous recipes */
    var a_class = recipes[0]['A-Class'];
    var b_class1 = recipes[1]['B-Class'];
    var b_class2 = recipes[2]['B-Class'];

    $('.recipe-img').empty();

    $('#a-class').append('<img id="recipe-image1" class="loading img-circle backup_picture"' +
        'src="/static/pictures/recipe_pic/' + a_class['name'] + '.jpg" width="200" height="200">' +
        '<h2>' + a_class['name'].capitalize() + '</h2>' +
        '<p><a class="btn btn-default" id="recipe-button1" role="button">View details &raquo;</a></p>');

    $('#recipe-button1').on('click', function () {
        showRecipe(a_class);
    });

    $('#recipe-image1').on('click', function () {
        showRecipe(a_class);
    });

    $('#b-class1').append('<img id="recipe-image2" class="loading img-circle backup_picture" src="/static/pictures/recipe_pic/' +
        b_class1['name'] + '.jpg" width="150" height="150">' +
        '<h4>' + b_class1['name'].capitalize() + '</h4>' +
        '<p><a class="btn btn-default" id="recipe-button2" role="button">View details &raquo;</a></p>');

    $('#recipe-button2').on('click', function () {
        showRecipe(b_class1);
    });

    $('#recipe-image2').on('click', function () {
        showRecipe(b_class1)
    });

    $('#b-class2').append('<img id="recipe-image3" class="loading img-circle backup_picture" src="/static/pictures/recipe_pic/' +
        b_class2['name'] + '.jpg" width="150" height="150">' +
        '<h4>' + b_class2['name'].capitalize() + '</h4>' +
        '<p><a class="btn btn-default" id="recipe-button3" role="button">View details &raquo;</a></p>');

    $('#recipe-button3').on('click', function () {
        showRecipe(b_class2);
    });

    $('#recipe-image3').on('click', function () {
        showRecipe(b_class2);
    });

    $(".backup_picture").on("error", function () {
        $(this).attr('src', '/static/pictures/recipe_pic/healthy-substitute.jpg');
    });

}

/* Display recipe modal */
function showRecipe(recipe) {
    const modal = $('#recipeModal');
    const modalBody = $('#recipeModalBody');

    $('#recipeModalTitle').text(recipe['name'].capitalize());
    modalBody.empty();
    modalBody.append(recipe['list_ingredients']);
    modalBody.append(recipe['method']);

    modal.modal({backdrop: 'static', keyboard: false});
    modal.modal('show');
    modal.find('.recipe-ingredients__link').contents().unwrap();
    modal.find('.recipe-ingredients__glossary-link').contents().unwrap();
    modal.find('.recipe-ingredients__glossary-element').remove();
    modal.find('.node-glossary-item').remove();
    modal.find('.recipe-method__list').before('<h2 class="recipe-ingredients__heading">Method</h2>');
}