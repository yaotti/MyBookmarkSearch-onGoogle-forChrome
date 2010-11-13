var BookmarkSearch = function() {
    this.userName = undefined;
    this.q        = '';
    this.prev_q   = '';
    this.of       = '0';    // offset
    this.limit    = '10';   // max 100
    this.sort     = 'date'; // date, scores, users
}



BookmarkSearch.prototype = {
    setUserName : function(onSetUserName) {
        if (!!this.userName) {
            onSetUserName();
            return;
        }
        var self = this;
        chrome.extension.sendRequest('http://b.hatena.ne.jp/my.name', function(res) {
            self.userName = JSON.parse(res).name;
            onSetUserName();
        });
    },
    setSearchWords : function() {
        this.q = document.getElementsByName('q')[0].value.replace(/^\s+|\s+$/g, '').replace(/\s+/g, '+');
    },
    makeQuery : function() {
        var query =  'http://b.hatena.ne.jp/' + this.userName + '/search/json';
        query     += '?q=' + this.q + '&limit=' + this.limit + '&sort=' + this.sort;
        return query;
    },
    searchBookmarks : function(onSearch) {
        this.setSearchWords();
        if (this.q == this.prev_q) return;
        this.prev_q = this.q;
        var self = this;
        this.setUserName(function (){
            chrome.extension.sendRequest(self.makeQuery(), function(res) {
                var json = JSON.parse(res);
                onSearch(json);
            });
        });
    },

};

function SearchResults(entries) {
    this.entries        = entries;
    this.searchSuccess  = false;
    this.dfOfAllEntries = document.createDocumentFragment();
    this.hbResultArea   = elem('div',
                               {id:'hBookmark-result-area',
                                styles: { width: '300px',
                                          position: 'absolute',
                                          right: '0px',
                                          top: '0px'}});
}

SearchResults.prototype = {
    show : function() {
        if (this.searchResultsExists()) {
            this.searchSuccess = true;
            this.makeDfOfAllEntries();
        }
        this.initRightNav();
        this.makeRightNav();
        this.insert();
        this.hbResultArea = null;
    },
    searchResultsExists : function() {
        return this.entries.length > 0;
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
            title.style.fontSize = '14px';

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
            bookmarkCount.style.className = 'l';
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
        if (this.hbResultArea && this.hbResultArea.parentNode) {
            this.hbResultArea.parentNode.removeChild(this.hbResultArea);
        }
        this.hbResultArea = elem('div',
                                 {id:'hBookmark-result-area',
                                  styles: { width: '300px',
                                            position: 'absolute',
                                            right: '0px',
                                            top: '0px'}});

    },
    makeRightNav : function() {
        var searchContainer;
        if (this.searchSuccess) {
            var searchResults = elem('dl', {class:'hBookmark-search-results', ns: true});
            searchResults.appendChild( this.dfOfAllEntries );

            var searchInfo = elem('div', {class:'hBookmark-search-info', ns: true});
            var searchMore = elem('div', {class:'hBookmark-search-more', ns: true});
            searchContainer = elem('div', {class:'hBookmark-search-container'});
            searchContainer.appendChild( searchInfo );
            searchContainer.appendChild( searchResults );
            searchContainer.appendChild( searchMore );
        }else{
            var searchFailure = elem('div', {class:'hBookmark-search-failure'});
            searchFailure.appendChild( text('はてなブックマークには該当する結果が存在しませんでした') );
            searchContainer = elem('div', {class:'hBookmark-search-container'});
            searchContainer.appendChild( searchFailure );
        }

        var searchTitle = elem('span', {class:'hBookmark-search-title'});
        searchTitle.appendChild( text('はてなブックマークからの検索') );
        searchTitle.style.fontSize = '15px';
        var searchHeading = elem('div', {class:'hBookmark-search-heading'});
        searchHeading.appendChild( searchTitle );

        var searchDiv = elem('div', {id: 'hBookmark-search', ns: true, styles: { width: '290px', fontSize: '12px' }});
        searchDiv.appendChild( searchHeading );
        searchDiv.appendChild( searchContainer );

        if (document.getElementById('rhs_block')) {
            document.getElementById('rhs_block').parentNode.removeChild(document.getElementById('rhs_block'));
        }
        var rhsBlock = elem('div', {id:'rhs_block'});
        rhsBlock.appendChild( searchDiv );
        this.hbResultArea.appendChild( rhsBlock );
    },
    insert : function() {
        var centerColumn = document.querySelector('#center_col');
        if(centerColumn){
            centerColumn.style.width = '562px';
            centerColumn.style.marginRight = '10px';
            centerColumn.parentNode.appendChild(this.hbResultArea);
        }
    },
};

// Utils
function elem(elem, opt) {
    var newElem =  document.createElement(elem);
    if(opt){
        if (opt.id)   { newElem.id           = opt.id; }
        if (opt.class){ newElem.className    = opt.class; }
        if (opt.ns)   { newElem.namespaceURI = 'http://www.w3.org/1999/xhtml'; }
        if (opt.styles) {
            for (var key in opt.styles) {
                newElem.style[key] = opt.styles[key];
            }
        }
    }
    return newElem;
}

function text(text) {
    return document.createTextNode(text);
}


var searcher = new BookmarkSearch();
window.setInterval(function() {
    searcher.searchBookmarks(function (results){
        var searchResults = new SearchResults(results.bookmarks);
        searchResults.show();
    });
}, 500);
