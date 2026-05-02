import {
  GraduationCap, Book, Library, ClipboardList, HelpCircle, File, Bookmark, BookOpen, 
  Calculator, LineChart, BarChart, FlaskConical, Rocket, Gauge, Thermometer, Waves, 
  Shrink, Ruler, Zap, Cpu, Cable, Battery, Radio, Antenna, Code, Terminal, Database, 
  Cloud, Network, Shield, Bug, PenTool, Blocks, HardHat, Wrench, Mountain, Building, 
  Dna, Droplet, Flame, Leaf, Hammer, Factory, Settings, Globe, Brain, Briefcase, 
  TrendingUp, Users, CheckSquare, FileSignature, ListTodo, LayoutGrid, Archive, 
  Lightbulb, Pen, Palette, Compass, Folder
} from 'lucide-react';

export const getLucideIcon = (iconKey, size = 24) => {
  switch (iconKey) {
    case 'school': return <GraduationCap size={size} />;
    case 'book': return <Book size={size} />;
    case 'library': return <Library size={size} />;
    case 'assignment': return <ClipboardList size={size} />;
    case 'quiz': return <HelpCircle size={size} />;
    case 'article': return <File size={size} />;
    case 'bookmark': return <Bookmark size={size} />;
    case 'folder': return <Folder size={size} />;
    case 'topic': return <BookOpen size={size} />;
    case 'math': return <Calculator size={size} />;
    case 'calculate': return <Calculator size={size} />;
    case 'analytics': return <LineChart size={size} />;
    case 'bar_chart': return <BarChart size={size} />;
    case 'science': return <FlaskConical size={size} />;
    case 'rocket': return <Rocket size={size} />;
    case 'speed': return <Gauge size={size} />;
    case 'thermostat': return <Thermometer size={size} />;
    case 'waves': return <Waves size={size} />;
    case 'compress': return <Shrink size={size} />;
    case 'straighten': return <Ruler size={size} />;
    case 'electrical': return <Zap size={size} />;
    case 'bolt': return <Zap size={size} />;
    case 'memory': return <Cpu size={size} />;
    case 'developer_board': return <Cpu size={size} />;
    case 'cable': return <Cable size={size} />;
    case 'battery': return <Battery size={size} />;
    case 'sensors': return <Radio size={size} />;
    case 'cell_tower': return <Antenna size={size} />;
    case 'code': return <Code size={size} />;
    case 'terminal': return <Terminal size={size} />;
    case 'storage': return <Database size={size} />;
    case 'cloud': return <Cloud size={size} />;
    case 'lan': return <Network size={size} />;
    case 'security': return <Shield size={size} />;
    case 'bug': return <Bug size={size} />;
    case 'architecture': return <PenTool size={size} />;
    case 'foundation': return <Blocks size={size} />;
    case 'construction': return <HardHat size={size} />;
    case 'engineering': return <Wrench size={size} />;
    case 'terrain': return <Mountain size={size} />;
    case 'location_city': return <Building size={size} />;
    case 'biotech': return <Dna size={size} />;
    case 'water_drop': return <Droplet size={size} />;
    case 'local_fire': return <Flame size={size} />;
    case 'eco': return <Leaf size={size} />;
    case 'opacity': return <Droplet size={size} />;
    case 'build': return <Wrench size={size} />;
    case 'handyman': return <Hammer size={size} />;
    case 'precision_mfg': return <Factory size={size} />;
    case 'settings': return <Settings size={size} />;
    case 'hardware': return <Hammer size={size} />;
    case 'language': return <Globe size={size} />;
    case 'psychology': return <Brain size={size} />;
    case 'business': return <Briefcase size={size} />;
    case 'economics': return <TrendingUp size={size} />;
    case 'groups': return <Users size={size} />;
    case 'fact_check': return <CheckSquare size={size} />;
    case 'exam': return <FileSignature size={size} />;
    case 'checklist': return <ListTodo size={size} />;
    case 'category': return <LayoutGrid size={size} />;
    case 'archive': return <Archive size={size} />;
    case 'lightbulb': return <Lightbulb size={size} />;
    case 'draw': return <Pen size={size} />;
    case 'palette': return <Palette size={size} />;
    case 'explore': return <Compass size={size} />;
    default: return <Folder size={size} />;
  }
};
