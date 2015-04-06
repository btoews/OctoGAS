#!/bin/sh

coffee --no-header -cs\
  < ./src/labler.coffee\
  | sed "s/^(function() {/function labler() {/"\
  | sed "s/^}).call(this);/}/" > labler.gs

coffee --no-header -cs\
  < ./src/muter.coffee\
  | sed "s/^(function() {/function muter() {/"\
  | sed "s/^}).call(this);/}/"\
  > muter.gs

coffee --no-header -cs\
  < ./src/teams.coffee\
  | sed "s/^(function() {//"\
  | sed "s/^}).call(this);//"\
  | sed "s/\([a-zA-Z]*\) = function/function \1/"\
  > teams.gs

coffee --no-header -cs\
  < ./src/website.coffee\
  | sed "s/^(function() {//"\
  | sed "s/^}).call(this);//"\
  | sed "s/\([a-zA-Z]*\) = function/function \1/"\
  > website.gs
