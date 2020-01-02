/* SPDX-License-Identifier: GPL-3.0-or-later */

function makeHeap(){
  var pairs = [];
  var max = Number.POSITIVE_INFINITY;
  var set = new Set();

  return {
    max: function (){
      return max;
    },
    add: function (hash, str) {
      /* The original mash ensures that hashes are unique. However,
       * I think this should be about the k-mers, no?
       */
      if (set.has(hash)) return;

      pairs.push([hash, str]);
      set.add(hash);

      if (pairs.length > GLOBALS.sketchSize){
        pairs.sort(function (a,b){
          return _get_hash(a) - _get_hash(b);
        });
        var popped = pairs.pop();
        set.delete(_get_hash(popped));
        max = _get_hash(pairs[pairs.length - 1]);
      }
    },
    size: function () {
      return pairs.length;
    },
    kmers: function() {
      return pairs.map(_get_kmer);
    },
    pairs: function() {
      return pairs;
    }
  };
}


function splitFile(str) {
  var arr = str.split(/^>[^\n\r]+\n/gm);
  arr.shift();
  return arr;
}

function sketchFile (contents, onprogress) {
  // todo: detect format error
  var sketches = splitFile(contents).map(function (seq) {
    return sketch(seq, onprogress);
  });
  return sketch.merge(sketches);
}

function _get_hash(pair) { return pair[0];}
function _get_kmer(pair) { return pair[1];}

function sketch(smth, onprogress) {
  var pairs = smth instanceof Array ? smth : sketchSeq(smth, onprogress).pairs();

  return {
    pairs: function () {
      return pairs;
    },
    distance: function (other) {
      var denom = GLOBALS.sketchSize; // TODO: fixme
      var jaccard = overlap(pairs, other.pairs())/denom;

      return -Math.log(2 * jaccard / (1 + jaccard)) / GLOBALS.K;
    },
    merge: function (other) {
      var merged = makeHeap();

      for (var p of pairs.concat(other.pairs())) {
        merged.add(_get_hash(p), _get_kmer(p));
      }

      pairs = merged.pairs();
    }
  };
}

sketch.merge = function (sketches) {
  var sum = sketch("");

  for (var s of sketches) {
    sum.merge(s);
  }

  return sum;
}

function overlap (arr1, arr2) {
  // assume both are sorted
  var counter = 0, i = 0, j = 0;
  var total = 0;

  while (total++ < GLOBALS.sketchSize && i < arr1.length && j < arr2.length) {
    if (_get_hash(arr1[i]) < _get_hash(arr2[j])) {
      i++;
    } else {
      if (_get_hash(arr1[i]) == _get_hash(arr2[j])) {
        counter++;
        i++;
      }
      j++;
    }
  }

  return counter;
}

function revcomp(str) {
  // var map = {A:'T', C:'G', G:'C', T:'A'};
  return str.split("").reverse().map(function (char){
    var num = char.charCodeAt(0);
    var comp = num ^= num & 2 ? 4 : 21;
    return String.fromCharCode(comp);
  }).join("");
}

function sketchSeq(str, onprogress) {
  // todo: uppercase
  str = str.replace(/\n/g,"");

  var ralphabet = RegExp("[" + GLOBALS.alphabet + "]");
  // var arr = [];
  // for (var i = 0; i < 255; i++) arr[i] = 0;
  // GLOBALS.alphabet.split("").forEach(function (c){
  //   arr[c.charCodeAt(0)] = 1;
  // });

  function isValidKMer(i) {
    // todo: speedup
    var j = Math.max(i, isValidKMer.goodPosition);

    for (; j < i + GLOBALS.K; j++) {
      var c = str[j];
      // if (!arr[str.charCodeAt(j)]) return false;
      if (!ralphabet.test(c)) return false;
      // if (!GLOBALS.alphabet.includes(c)) return false;
      isValidKMer.goodPosition = j;
    }
    return true;
  }
  isValidKMer.goodPosition = 0;

  var heap = makeHeap();

  var canonicalize = GLOBALS.alphabet != "ACGT" ? function (i) {
    return kmer(str, i);
  } : function (i){
    var forward = kmer(str, i);
    var reverse = revcomp(forward);
    return forward < reverse ? forward : reverse;
  };

  var valid = 0;
  for (var i = 0; i < str.length - GLOBALS.K - 1; i++) {
    if (onprogress && i % 100000 == 0) {
      onprogress(i / str.length);
    }
    if (isValidKMer(i)) {
      var tohash = canonicalize(i);
      var hash = mmh3(tohash);
      if (hash < heap.max()) {
        heap.add(hash, tohash);
      }
    }
    valid++;
  }

  return heap;
}
