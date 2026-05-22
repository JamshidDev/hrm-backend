@extends('application::layouts.master')

@section('content')
    <h1>Hello World</h1>

    <p>Module: {!! config('application.name') !!}</p>
@endsection
