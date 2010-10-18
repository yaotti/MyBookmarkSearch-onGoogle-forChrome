

// ブックマーク検索のリクエストURI作るもの
var BookmarkSearch = function() {
    this.userName = getUserName();
    this.q        = getSearchWords();
    this.of       = '10';   // offset
    this.limit    = '10';   // max 100
    this.sort     = 'date'; // date, scores, users
}

BookmarkSearch.prototype = {
    getUserName : function() {
	    chrome.extension.sendRequest('http://b.hatena.ne.jp/my.name',
            function onSuccess(res) {
                var json = JSON.parse(res);
                return json.name;
	    });
    },
    getSearchWords : function() {
        var params = window.location.search.substring(1).split('&');
        var q = '';
        params.forEach(function(elm) {
            if (/^q=(.+)/.test(elm)) q = elm.split('=')[1];
        });
        return q;
    },
    makeQuery : function() {
        var query =  'http://b.hatena.ne.jp/' + this.userName + '/search/json';
        query    += '?q=' + this.q + '&limit=' + this.limit + '&sort=' + this.sort;
        return query;
    },
    searchBookmarks : function() {
	    chrome.extension.sendRequest(this.makeQuery(), function onSuccess(res) {
            var json = JSON.parse(res);
            return json; // とりあえず生のまま
	    });
    },

}
};

//Googleから盗みはてなに投げ、レスポンスもらうまで
(function() {
    //set
    var searcher = new BookmarkSearch();
    var data = searcher.searchBookmarks();
    console.log(data);

    // DOMにさわる
    window.onload = function() {
        alert('loaded');
    }


})();

