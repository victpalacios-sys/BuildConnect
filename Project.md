This is a brand new project and needs a brand new github repository. 

Please do a deep research for "That Open Company" which has an open source project for BIM workflows. I want to build a tool for engineers that create wireless and wired networks inside office or apartment buildings.

The high level workflow is as follows:





an engineer or a surveyor receives a new work order for creating a wireless or wired network to provide internet access for an office or apartment building.



In most cases they need to survey the building or floor itself to figure out how and where to place the equipment, cables, labor needed, city work permits, etc. for fiber to the office or to the home they typically need to identify the fiber source which usually is outside the building in the vicinity of it. then figure out how to bring the fiber inside the building; could be digging a trench, or aerial cable using existing poles or need to install poles and other require infrastructure. Inside the building they need to figure out where to place the fiber hub, identify risers to pull cable through and to reach all the required floors. In some cases they need to install some fiber hubs on some floors and then bring the fiber to each of the apartment units or offices. 





Ideally they would use streets maps for the area around the building to annotate the location for the external fiber source and to annotate the route of the cable all the way inside the building. This includes all the civil work required. This feeds also to the city work permits documentation. The streets maps could use Open Streets map or google maps or some useful source of information.



Then they need to do a simple sketch in 2D of the perimeter of the building. I have seen that open streets maps or google maps have this information so it would be great that they get this information automatically. This information becomes the basis for the external walls of the building.



Then they typically need the interior walls of the building. If this information is somewhere available then the software tool should use it. If not then we need to provide simple tools to sketch these walls, doors and windows. So we can assume that the surveyor will be using a tablet or smartphone. The UX for this is critical because they typically only have less than one hour to do the survey and most of their time is spend negotiating with the building manager where to place the equipment and cable routes. So the note taking interaction is done in short bursts of a few seconds. They need also be able to take pictures and annotate the floorplan with text notes and pictures. The ux needs to be clever enough to eliminate erroneous interpretations of user's inputs.



They need to be able to have a quick and simple sketch of the whole building. Given that most buildings are parallelograms; all the external walls of all floors are the same. You can think of it as a stack of pizza boxes where each box is one floor. If the number of floors is already available in open streets maps or any other data source then we must use it otherwise let the surveyor enter this information. And the software should generate the external walls of the whole building



The source of truth of the building model should be a 3D BIM model. But we need to simplify the data input (notes, cable routes, internal walls, etc) on 2D views; most of them would be the typical floorplan on 2D but in some cases they need one or more vertical 2D views of the building to draw cable routes between floors, annotate with text or pictures, etc.



After they are able to design the whole network from the external source point all the way to each apartment unit or office. They need to be able to simulate the performance of the wireless network to comply with their customer's performance requirements.



Once the design is solid then they need to generate a bill of materials, city work permits documents, labor plan and final quote. 



The information generated should also be easily communicated to other software tools for seamless integration into their existing workflows.



In some cases these engineers need to create a visually attractive bid documentation with beautiful building renditions showing the final design of the network.



Moreover when they are doing a survey in many cases they don't have internet access so they need to be able to start the project from the office to load all the needed information and probably start the building model. And when they are onsite they need to be able to continue their work without any internet access. 



Please research this workflow and look for any missing elements.

