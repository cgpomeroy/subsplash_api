const express = require('express');
const app = express();
const axios = require('axios');
const yt = require('youtube-duration-format');

const YOUTUBE_API_KEY = "AIzaSyAK7iuUqK6rO2d2d9x5_2LFSc9KFYzJCFk";
const YOUTUBE_BASE_CALL = `https://www.googleapis.com/youtube/v3/videos?part=statistics&key=${YOUTUBE_API_KEY}&id=`;
const YOUTUBE_GET_RUNTIME = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&key=${YOUTUBE_API_KEY}&id=`;
const YOUTUBE_GET_TITLE = `https://www.googleapis.com/youtube/v3/videos?part=snippet&key=${YOUTUBE_API_KEY}&id=`;

const subsplashResults = [];
let htmlResults = "<html><body><table><tr><th>Title</th><th>Duration</th><th>URL</th><th>Reach</th></tr>";
let complete = false;

app.get('/', function(req, res){

    getSubsplash(getViews);

    return new Promise((resolve, reject)=>{
      while(complete){
          res.send(htmlResults);
      }
    })
});

app.listen(3000, console.log("Server listening on Port 3000."));

    async function getSubsplash(callback){
        const res = await axios.get("https://challenge.subsplash.net", {headers: { "X-Sap-Auth": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlN2U5NDhlOC0xMzA3LTRhNDktOTkzZS1jZDQwMGIyNDBiNzMiLCJpYXQiOjE1MTc0NDMyMDB9.cCnoZDiDA1wZDw2jrbRgpwWvtA5nHHaDaUKLl1fAXAY"}});

        const videos = res.data["_embedded"]["media-items"];

        for(let i = 0; videos[i]; i++){
            let video = {};
            video.urlFull = videos[i]["youtube_url"];
            video.url = videos[i]["youtube_url"].split("https://www.youtube.com/watch?v=")[1];
            video.reach = videos[i]["reach"];

            subsplashResults.push(video);
        }
        console.log("Subsplash API call complete.");
        callback(subsplashResults, getViews);
    }

    async function getViews(results, callback){
        for(const res in results) {
            if(results[res].url && results[res].url.length == 11){
                const resp = await axios.get(YOUTUBE_BASE_CALL+results[res].url);
                subsplashResults[res].views = resp.data["items"][0]["statistics"].viewCount;
            }else if(results[res].url && results[res].url.indexOf("&") > -1){
                const newURL = results[res].url.split("&")[0];
                const resp = await axios.get(YOUTUBE_BASE_CALL+newURL);
                results[res].views = resp.data["items"][0]["statistics"].viewCount;
                results[res].url = newURL;
            }else{

            }
        }
        callback(subsplashResults, getTime)
    }

    async function getTime(results, callback){
        for(const res in results) {
            if(results[res].views){
                const resp = await axios.get(YOUTUBE_GET_RUNTIME+results[res].url);
                results[res].rtString = yt(resp.data["items"][0]["contentDetails"].duration);
                results[res].runTime = hmsToSec(yt(resp.data["items"][0]["contentDetails"].duration));
            }
        }



        callback(subsplashResults, getTitle);
    }

    async function getTitle(results, callback){
        for(const res in results){
            if(results[res].url){
                const resp = await axios.get(YOUTUBE_GET_TITLE+results[res].url);
                const title = resp.data["items"][0]["snippet"].title;
                results[res].title = title;
            }
        }

        callback(subsplashResults, sortResults);
    }

    function sortResults(results) {
        results.sort(compare);
        for (const res in results) {
            if (results[res].url && results[res].views > 99 && results[res].runTime > 2699) {
                htmlResults += `<tr><td>${results[res].title}</td><td>${results[res].rtString}</td><td>${results[res].urlFull}</td><td>${results[res].reach}</td>`
            }
        }

        htmlResults += "</table></body></html>";
        complete = true;
    }

    function hmsToSec(str) {
        var p = str.split(':'),
            s = 0, m = 1;

        while (p.length > 0) {
            s += m * parseInt(p.pop(), 10);
            m *= 60;
        }

        return s;
    }

    function compare(a,b) {
        if (a.reach > b.reach)
            return -1;
        if (a.reach < b.reach)
            return 1;
        return 0;
    }




