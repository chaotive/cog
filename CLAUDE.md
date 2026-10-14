# Project summary

This is COG: Cities of Gold. A Nodejs developed, Typescript 
written and Phaser driven video game web application.

It is a cell-based, 2D flat map, exploration game, that allows the
user to discover cities of Gold in what would be a different 
continent, across the seas. The game starts with the player picking
up what to put onboard of a ship, to then cross the sea and
start exploring.

The game itself would allow strategy elements, RPG-like character 
progression, turn-based action on the map and city/resources 
management. A turn passes everytime the user moves. The computer
controls the user enemies.

# Code standards and guidelines

- Please separate clearly content from code:
  - Under src\game, there would be the generic code, that is reusable, sort of engine oriented code.
  - Under src\cog, there would be the COG specific code, which has to do with its scenes, characters, items and everything COG specific.