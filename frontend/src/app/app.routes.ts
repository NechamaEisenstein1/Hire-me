import { Routes } from '@angular/router';
import { HomePage } from './features/home/home.page';
import { InterviewMePage } from './features/interview-me/interview-me.page';
import { Resume3dPage } from './features/resume-3d/resume-3d.page';

export const routes: Routes = [
	{ path: '', component: HomePage },
	{ path: 'resume-3d', component: Resume3dPage },
	{ path: 'interview-me', component: InterviewMePage },
	{ path: '**', redirectTo: '' }
];
