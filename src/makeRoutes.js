import userRouter from './routes/user';
import templateRouter from './routes/notification/template';
import userAuthRouter from './routes/user/auth';

const makeRoutes = app => {
  // public routes
  app.use('/public/v1/users', userRouter);
  app.use('/public/v1/notifications/templates', templateRouter);

  // authenticated routes
  app.use('/auth/v1/users', userAuthRouter);
};

export default makeRoutes;
