var BookmarkSearch = function() {
    this.userName = undefined;
    this.q        = '';
    this.of       = '0';    // offset
    this.limit    = '10';   // max 100
    this.sort     = 'date'; // date, scores, users
}

BookmarkSearch.prototype = {
    setUserName : function(onSetUserName) {
        var that = this;
	    chrome.extension.sendRequest('http://b.hatena.ne.jp/my.name', function onSuccess(res) {
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
        query     += '?q=' + this.q + '&limit=' + this.limit + '&sort=' + this.sort;
        return query;
    },
    searchBookmarks : function(onSearch) {
        var that = this;
        this.setUserName(function onSetUserName() {
            that.setSearchWords();
	        chrome.extension.sendRequest(that.makeQuery(), function onSuccess(res) {
                var json = JSON.parse(res);
                onSearch(json);
	        });
        });
    },

};


function SearchResults(entries) {
    this.entries        = entries;
    this.searchSuccess  = 0;
    this.dfOfAllEntries = document.createDocumentFragment();
    this.rhs            = elem('div', {id:'rhs'});
}

SearchResults.prototype = {
    show : function() {
        if (this.searchResultsExists()) {
            this.searchSuccess = 1;
            this.makeDfOfAllEntries();
        }
        this.initRightNav();
        this.makeRightNav();
        this.insert();
    },
    searchResultsExists : function() {
        return  (this.entries.length) ? 1 : 0;
    },
    makeDfOfAllEntries : function() {
        for (var i = 0; i < this.entries.length; i++) {
            var entry = this.entries[i];

            var commentText = entry.comment; //
            var entryURL    = entry.entry.url
            var titleText   = entry.entry.title;
            var snippetText = entry.entry.snippet;
            var bookmarkSrc = 'http://b.hatena.ne.jp/entry/image/' + entryURL;
            var faviconURL  = 'http://favicon.st-hatena.com/?url=' + entryURL;
            var host        = entryURL.match(/^https?:\/\/(.+)/)[1];


            // タイトル部
            var title        = elem('dt');

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
                commentText = commentText.replace(/\[([^\[\]]+)\]/g, '<span class="hBookmark-search-tag">$1</span>' + ', ')
                comment.innerHTML = commentText;
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
            var dfEntry = document.createDocumentFragment();
            dfEntry.appendChild( title );
            dfEntry.appendChild( snippet );
            dfEntry.appendChild( comment );
            dfEntry.appendChild( info );
            this.dfOfAllEntries.appendChild( dfEntry );
        }
    },
    initRightNav : function() {
        var rightNav = document.querySelector('#rhs');
        if(rightNav){
            rightNav.parentNode.removeChild(rightNav);
        }
    },
    makeRightNav : function() {
        if (this.searchSuccess) {
            var searchResults = elem('dl', {class:'hBookmark-search-results', ns: 1});
            searchResults.appendChild( this.dfOfAllEntries );

            var searchInfo = elem('div', {class:'hBookmark-search-info', ns:1});
            var searchMore = elem('div', {class:'hBookmark-search-more', ns:1});
            var searchContainer = elem('div', {class:'hBookmark-search-container'});
            searchContainer.appendChild( searchInfo );
            searchContainer.appendChild( searchResults );
            searchContainer.appendChild( searchMore );
        }else{
            var searchFailure = elem('div', {class:'hBookmark-search-failure'});
            searchFailure.appendChild( text('はてなブックマークには該当する結果が存在しませんでした') );
            var searchContainer = elem('div', {class:'hBookmark-search-container'});
            searchContainer.appendChild( searchFailure );

        }

        var searchTitle = elem('span', {class:'hBookmark-search-title'});
        searchTitle.appendChild( text('はてなブックマークからの検索') );
        var searchHeading = elem('div', {class:'hBookmark-search-heading'});
        searchHeading.appendChild( searchTitle );

        var searchDiv = elem('div', {id: 'hBookmark-search', ns:1});
        searchDiv.appendChild( searchHeading );
        searchDiv.appendChild( searchContainer );

        var mbEnd = elem('table', {id: 'mbEnd'});
        var mbEndCell = mbEnd.insertRow(0).insertCell(0);
        mbEndCell.appendChild( searchDiv );

        var rhsBlock = elem('div', {id:'rhs_block'});
        rhsBlock.appendChild( mbEnd );
        this.rhs.appendChild( rhsBlock );
    },
    insert : function() {
        var leftNav = document.querySelector('#leftnav');
        leftNav.parentNode.insertBefore(this.rhs, leftNav);
    },
};


(function() {
    //set
    var searcher = new BookmarkSearch();
    searcher.searchBookmarks(function onSearch(results){
        var searchResults = new SearchResults(results.bookmarks);
        searchResults.show();
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
