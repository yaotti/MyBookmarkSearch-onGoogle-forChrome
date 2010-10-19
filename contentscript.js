// ブックマーク検索のリクエストURI作るもの
var BookmarkSearch = function() {
    this.userName = undefined;
    this.q        = '';
    this.of       = '10';   // offset
    this.limit    = '10';   // max 100
    this.sort     = 'date'; // date, scores, users
}

BookmarkSearch.prototype = {
    setUserName : function(onSetUserName) {
        var that = this;
	    chrome.extension.sendRequest('http://b.hatena.ne.jp/my.name',
            function onSuccess(res) {
                that.userName = JSON.parse(res).name;
                onSetUserName();
	    });
    },
    setSearchWords : function() {
        var params = window.location.search.substring(1).split('&');
        for (var i = 0; i < params.length; i++) {
            if (/^q=(.+)/.test(params[i])) this.q = params[i].split('=')[1];
        }
    },
    makeQuery : function() {
        var query =  'http://b.hatena.ne.jp/' + this.userName + '/search/json';
        query    += '?q=' + this.q + '&limit=' + this.limit + '&sort=' + this.sort;
        return query;
    },
    searchBookmarks : function(onSearch) {
        var that = this;
        // setSearchWordsやmakeQueryをsetUserNameの後にやらせたい…ので
        // setUserNameのonSuccess関数に突っ込む。しかし美しいやり方ではない気が…。
        this.setUserName(function onSetUserName() {
            that.setSearchWords();
	        chrome.extension.sendRequest(that.makeQuery(), function onSuccess(res) {
                var json = JSON.parse(res);
                onSearch(json);
	        });
        }); // イベント。順番ズレる
    },

};

function styleInitter(entries) {
    if (entries.length < 1) {
        alert('一致する情報は見つかりませんでした。');
        return;
    }

    var sideTable = document.querySelector('#mbEnd');
    if(sideTable){
        for (var i = 0; i < sideTable.rows.length; i++){
            sideTable.deleteRow(i);
        }
    }else{
        sideTable = elem('table', 'mbEnd');
    }
}
function showSearchResults(entries) {
    var searchResults = elem('dl', {class:'hBookmark-search-results', ns: 1});

    for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];

        var commentText = entry.comment; //
        var entryURL    = entry.entry.url
        var titleText   = entry.entry.title;
        var snippetText = entry.entry.snippet;
        var bookmarkSrc = 'http://b.hatena.ne.jp/entry/image/' + entryURL;
        var faviconURL  = 'http://favicon.st-hatena.com/?url=' + entryURL;
        var host        = entryURL.match(/^https?:\/\/(.+)/)[1];


        // タイトル部
        var title        = elem('dd');

        var titleLink    = elem('a');
        titleLink.target = '_blank';
        titleLink.href   = entryURL;

        var favicon      = elem('img');
        favicon.src      = faviconURL;

        titleLink.appendChild( favicon );
        titleLink.appendChild( text(titleText) );
        title.appendChild(titleLink);


        // snippet
        var snippet = elem('dd', {class:'hBookmark-search-snippet'});
        snippet.appendChild( text(snippetText) );
            // TODO 一致文字の置換（comment, snippet）


        // comment
        var comment = elem('dd', {class:'hBookmark-search-comment'});
        if (commentText) {
            comment.appendChild( text(commentText) );
            // TODO [tag]をマークアップに置換
        }


        // info
        var info             = elem('dd', {class:'hBookmark-search-info'});

        var searchURL        = elem('span', {class:'hBookmark-search-url'});
        var hostMin          = host;
        if (host.length > 40) { hostMin = host.substr(0,40) + '…' }
        searchURL.appendChild( text(hostMin) );

        var bookmarkImg      = elem('img');
        bookmarkImg.src      = bookmarkSrc;
        var bookmarkCount    = elem('a');
        bookmarkCount.target = '_blank';
        bookmarkCount.href   = 'http://b.hatena.ne.jp/entry/' + host;
        bookmarkCount.appendChild( bookmarkImg );

        info.appendChild( searchURL );
        info.appendChild( bookmarkCount );


        // すべて突っ込む
        var df = document.createDocumentFragment();
        df.appendChild(title);
        df.appendChild( snippet );
        df.appendChild( comment );
        df.appendChild( info );
        searchResults.appendChild( df );
    }
    document.body.insertBefore(searchResults, document.body.firstChild);
    // make container
    var searchnerInfo   = elem('div', {class:'hBookmark-search-info', ns:1});
    var searchMore      = elem('div', {class:'hBookmark-search-more', ns:1})
    var searchContainer = elem('div', {class:'hBookmark-search-container'})

    searchContainer.appendChild( searchInfo );
    searchContainer.appendChild( searchResults );
    searchContainer.appendChild( searchMore );

    var searchHeading   = elem('div', {class:'hBookmark-search-heading'})
    var searchnerDiv    = elem('div', {id:'hBookmark-search', ns:1})

    searchDiv.appendChild( searchHeading );
    searchDiv.appendChild( searchContainer );
}

//Googleから盗みはてなに投げ、レスポンスもらうまで
(function() {
    //set
    var searcher = new BookmarkSearch();
    searcher.searchBookmarks(function onSearch(json){

        var entries = json.bookmarks;

        styleInitter(entries);

        showSearchResults(entries);
    });


})();

// Utils
function elem(elem, opt) {
    var newElem =  document.createElement(elem);
    if(opt){
        if (opt.id)   { newElem.id           = opt.id; }
        if (opt.class){ newElem.className    = opt.class; }
        if (opt.ns)   { newElem.namespaceURI = 'http://www.w3.org/1999/xhtml'; }
    }
    return newElem;
}

function text(text) {
    return document.createTextNode(text);
}
